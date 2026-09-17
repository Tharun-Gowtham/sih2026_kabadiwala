from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.lot import Lot
from app.schemas.lot import LotLookupResponse

router = APIRouter(prefix="/qr", tags=["QR Handover Lookup"])

@router.get("/lookup/{lot_id}", response_model=LotLookupResponse)
def lookup_lot_by_qr(
    lot_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    CRITICAL RULE:
    The QR payload contains ONLY the Lot UUID.
    This endpoint retrieves authoritative lot information from the backend.
    QR scanning/lookup DOES NOT confirm the transaction.
    """
    lot = db.query(Lot).filter(Lot.lot_id == lot_id).first()
    if not lot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lot with ID '{lot_id}' not found"
        )

    dealer_name = lot.dealer.name if lot.dealer else "Unknown Dealer"
    recycler_name = lot.recycler.name if lot.recycler else None

    return LotLookupResponse(
        lot_id=lot.lot_id,
        category=lot.category,
        declared_weight=lot.declared_weight,
        dealer_id=lot.dealer_id,
        dealer_name=dealer_name,
        recycler_id=lot.recycler_id,
        recycler_name=recycler_name,
        status=lot.status,
        created_at=lot.created_at
    )
