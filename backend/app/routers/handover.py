import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_recycler, get_current_user
from app.core.config import LotStatus, UserRole, settings
from app.models.user import User
from app.models.lot import Lot
from app.models.recycler import RecyclerProfile
from app.models.transaction import Transaction
from app.schemas.transaction import (
    HandoverVerifyRequest,
    HandoverVerifyResponse,
    ConfirmHandoverRequest,
    TransactionResponse
)

router = APIRouter(prefix="/handover", tags=["Handover & Verification"])

@router.post("/verify/{lot_id}", response_model=HandoverVerifyResponse)
def verify_weight(
    lot_id: str,
    data: HandoverVerifyRequest,
    current_recycler: User = Depends(get_current_recycler),
    db: Session = Depends(get_db)
):
    lot = db.query(Lot).filter(Lot.lot_id == lot_id).first()
    if not lot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lot not found"
        )

    if lot.recycler_id != current_recycler.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to verify this lot"
        )

    # Discrepancy calculation: abs(declared - verified) / declared * 100
    declared = lot.declared_weight
    verified = data.verified_weight
    disc_pct = round(abs(declared - verified) / declared * 100.0, 2)
    has_warning = disc_pct > settings.DISCREPANCY_THRESHOLD_PERCENT

    warning_msg = None
    if has_warning:
        warning_msg = (
            f"Weight discrepancy detected: {disc_pct:.1f}% difference between declared ({declared:.2f} kg) "
            f"and verified ({verified:.2f} kg). Threshold is {settings.DISCREPANCY_THRESHOLD_PERCENT:.0f}%. "
            "Confirmation remains permitted after inspection."
        )

    return HandoverVerifyResponse(
        lot_id=lot.lot_id,
        category=lot.category,
        declared_weight=declared,
        verified_weight=verified,
        discrepancy_percentage=disc_pct,
        discrepancy_warning=has_warning,
        warning_message=warning_msg
    )

@router.post("/confirm/{lot_id}", response_model=TransactionResponse)
def confirm_handover(
    lot_id: str,
    data: ConfirmHandoverRequest,
    current_recycler: User = Depends(get_current_recycler),
    db: Session = Depends(get_db)
):
    """
    CRITICAL SERVER-SIDE OPERATION:
    Validates recycler authorization, lot status, prevents duplicates,
    calculates discrepancy & payout, and atomically commits transaction.
    """
    lot = db.query(Lot).filter(Lot.lot_id == lot_id).first()
    if not lot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lot not found"
        )

    # Authorization: only assigned recycler can confirm
    if lot.recycler_id != current_recycler.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to confirm this lot"
        )

    # Duplicate / Status check: lot must not already be completed
    if lot.status == LotStatus.COMPLETED.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Lot '{lot_id}' has already been confirmed and completed. Duplicate confirmation rejected."
        )

    # Check if transaction already exists for this lot
    existing_tx = db.query(Transaction).filter(Transaction.lot_id == lot_id).first()
    if existing_tx:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Transaction already exists for lot '{lot_id}'. Duplicate confirmation rejected."
        )

    declared = lot.declared_weight
    verified = data.verified_weight
    disc_pct = round(abs(declared - verified) / declared * 100.0, 2)

    # Determine recycler rate for this category
    profile = db.query(RecyclerProfile).filter(RecyclerProfile.user_id == current_recycler.id).first()
    rate = 100.0  # Fallback baseline rate
    if profile and profile.rates:
        rate = float(profile.rates.get(lot.category, rate))

    total_payout = round(verified * rate, 2)

    # ATOMIC EXECUTION
    try:
        # 1. Update lot status to COMPLETED
        lot.status = LotStatus.COMPLETED.value
        lot.updated_at = datetime.now(timezone.utc)

        # 2. Create authoritative Transaction
        tx = Transaction(
            transaction_id=str(uuid.uuid4()),
            lot_id=lot.lot_id,
            dealer_id=lot.dealer_id,
            recycler_id=current_recycler.id,
            category=lot.category,
            declared_weight=declared,
            verified_weight=verified,
            discrepancy_percentage=disc_pct,
            rate_per_kg=rate,
            total_payout=total_payout,
            status=LotStatus.COMPLETED.value,
            timestamp=datetime.now(timezone.utc),
            notes=data.notes
        )
        db.add(tx)
        db.commit()
        db.refresh(tx)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to confirm handover: {str(e)}"
        )

    return TransactionResponse(
        transaction_id=tx.transaction_id,
        lot_id=tx.lot_id,
        dealer_id=tx.dealer_id,
        dealer_name=lot.dealer.name if lot.dealer else None,
        recycler_id=tx.recycler_id,
        recycler_name=current_recycler.name,
        category=tx.category,
        declared_weight=tx.declared_weight,
        verified_weight=tx.verified_weight,
        discrepancy_percentage=tx.discrepancy_percentage,
        rate_per_kg=tx.rate_per_kg,
        total_payout=tx.total_payout,
        status=tx.status,
        disputed=tx.disputed,
        dispute_reason=tx.dispute_reason,
        timestamp=tx.timestamp,
        notes=tx.notes
    )
