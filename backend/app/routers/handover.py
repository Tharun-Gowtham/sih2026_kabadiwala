import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.dependencies import get_current_recycler, get_current_user
from app.core.config import LotStatus, UserRole, settings
from app.models.user import User
from app.models.lot import Lot
from app.models.recycler import RecyclerProfile
from app.models.transaction import Transaction
from app.models.batch import Batch, BatchLot
from app.services.batch_service import complete_batch
from app.services.audit_service import log_action
from app.services.fraud_detection import update_dealer_trust, create_fraud_alert
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
    if disc_pct > settings.CRITICAL_DISCREPANCY_PERCENT:
        warning_msg = (
            f"⛔ CRITICAL: Weight discrepancy of {disc_pct:.1f}% exceeds the critical threshold "
            f"of {settings.CRITICAL_DISCREPANCY_PERCENT:.0f}%. Confirmation will be BLOCKED. "
            f"Declared: {declared:.2f} kg, Verified: {verified:.2f} kg. "
            "An admin override is required to proceed."
        )
    elif has_warning:
        warning_msg = (
            f"⚠️ Weight discrepancy detected: {disc_pct:.1f}% difference between declared ({declared:.2f} kg) "
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
    request: Request,
    current_recycler: User = Depends(get_current_recycler),
    db: Session = Depends(get_db)
):
    """
    CRITICAL SERVER-SIDE OPERATION with FRAUD PREVENTION:
    1. Validates recycler authorization and lot status
    2. Enforces cooling period (MIN_HANDOVER_WAIT_MINUTES)
    3. Blocks confirmation if discrepancy > CRITICAL_DISCREPANCY_PERCENT
    4. Enforces daily dealer-recycler pair transaction cap (anti-collusion)
    5. Calculates payout and atomically commits transaction
    6. Logs to tamper-evident audit trail
    7. Recomputes dealer trust score
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

    # ── FRAUD PREVENTION: Cooling Period ──
    # Lot must have been in PENDING_HANDOVER for at least MIN_HANDOVER_WAIT_MINUTES
    if lot.updated_at:
        lot_updated = lot.updated_at
        if lot_updated.tzinfo is None:
            lot_updated = lot_updated.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        elapsed_minutes = (now - lot_updated).total_seconds() / 60.0
        if elapsed_minutes < settings.MIN_HANDOVER_WAIT_MINUTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cooling period not met: Lot was assigned {elapsed_minutes:.0f} minutes ago. "
                       f"A minimum of {settings.MIN_HANDOVER_WAIT_MINUTES} minutes must pass "
                       f"before confirmation to prevent instant fabrication loops."
            )

    declared = lot.declared_weight
    verified = data.verified_weight
    disc_pct = round(abs(declared - verified) / declared * 100.0, 2)

    # ── FRAUD PREVENTION: Critical Discrepancy Hard-Block ──
    if disc_pct > settings.CRITICAL_DISCREPANCY_PERCENT:
        create_fraud_alert(
            db, lot.dealer_id, "HIGH_DISCREPANCY", "CRITICAL",
            {
                "lot_id": lot_id,
                "declared_weight": declared,
                "verified_weight": verified,
                "discrepancy_percent": disc_pct,
                "recycler_id": current_recycler.id,
            }
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"BLOCKED: Weight discrepancy of {disc_pct:.1f}% exceeds the critical threshold "
                   f"of {settings.CRITICAL_DISCREPANCY_PERCENT:.0f}%. "
                   f"Declared: {declared:.2f} kg, Verified: {verified:.2f} kg. "
                   f"This transaction requires admin investigation. A fraud alert has been filed."
        )

    # ── FRAUD PREVENTION: Anti-Collusion Daily Pair Cap ──
    day_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    pair_count = db.query(Transaction).filter(
        Transaction.dealer_id == lot.dealer_id,
        Transaction.recycler_id == current_recycler.id,
        Transaction.timestamp >= day_start,
    ).count()

    if pair_count >= settings.MAX_DEALER_RECYCLER_TXN_PER_DAY:
        create_fraud_alert(
            db, lot.dealer_id, "COLLUSION_PATTERN", "HIGH",
            {
                "dealer_id": lot.dealer_id,
                "recycler_id": current_recycler.id,
                "daily_pair_count": pair_count,
                "limit": settings.MAX_DEALER_RECYCLER_TXN_PER_DAY,
            }
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Daily transaction limit reached: {pair_count} transactions today between "
                   f"this dealer and recycler (max {settings.MAX_DEALER_RECYCLER_TXN_PER_DAY}/day). "
                   f"This limit prevents potential collusion patterns."
        )

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

        # ── Audit Trail ──
        log_action(
            db=db,
            actor_id=current_recycler.id,
            actor_role=current_recycler.role,
            action="HANDOVER_CONFIRMED",
            entity_type="Transaction",
            entity_id=tx.transaction_id,
            details={
                "lot_id": lot_id,
                "dealer_id": lot.dealer_id,
                "declared_weight": declared,
                "verified_weight": verified,
                "discrepancy_percent": disc_pct,
                "rate_per_kg": rate,
                "total_payout": total_payout,
            },
            ip_address=request.client.host if request.client else None,
        )

        db.commit()
        db.refresh(tx)

        # Recompute dealer trust score after handover
        try:
            update_dealer_trust(db, lot.dealer_id)
            db.commit()
        except Exception:
            pass  # Don't fail the handover if trust update fails

        # Auto-complete batch if all sibling lots in the same batch are COMPLETED
        sibling_bl = db.query(BatchLot).filter(BatchLot.lot_id == lot_id).first()
        if sibling_bl:
            batch_id = sibling_bl.batch_id
            sibling_lot_ids = [
                bl.lot_id
                for bl in db.query(BatchLot).filter(BatchLot.batch_id == batch_id).all()
            ]
            all_completed = all(
                db.query(Lot).filter(Lot.lot_id == lid).first().status == LotStatus.COMPLETED.value
                for lid in sibling_lot_ids
            )
            if all_completed:
                try:
                    complete_batch(db, batch_id)
                except Exception:
                    pass  # Don't fail the handover if batch completion fails

    except HTTPException:
        raise
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

