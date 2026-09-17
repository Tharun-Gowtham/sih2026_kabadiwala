from typing import Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_dealer
from app.core.config import settings, LotStatus
from app.models.user import User
from app.models.purchase import Purchase
from app.models.lot import Lot
from app.schemas.stock import StockResponse, StockCategorySummary

router = APIRouter(prefix="/stock", tags=["Stock"])

@router.get("", response_model=StockResponse)
def get_dealer_stock(
    current_dealer: User = Depends(get_current_dealer),
    db: Session = Depends(get_db)
):
    # Fetch all purchases for this dealer
    purchases = db.query(Purchase).filter(Purchase.dealer_id == current_dealer.id).all()

    # Pre-populate dictionary for all 7 strict categories
    stats: Dict[str, Dict[str, float]] = {
        cat: {
            "available_weight": 0.0,
            "total_purchased_weight": 0.0,
            "pooled_weight": 0.0,
            "completed_weight": 0.0,
            "purchase_count": 0
        }
        for cat in settings.VALID_CATEGORIES
    }

    # Iterate over purchases
    for p in purchases:
        cat = p.category
        if cat not in stats:
            continue
        
        stats[cat]["total_purchased_weight"] += p.weight
        stats[cat]["purchase_count"] += 1

        if p.lot_id is None:
            # Not in any lot -> Currently AVAILABLE
            stats[cat]["available_weight"] += p.weight
        else:
            # Check lot status
            if p.lot and p.lot.status == LotStatus.COMPLETED.value:
                stats[cat]["completed_weight"] += p.weight
            elif p.lot and p.lot.status == LotStatus.CANCELLED.value:
                stats[cat]["available_weight"] += p.weight
            else:
                # POOLED or PENDING_HANDOVER
                stats[cat]["pooled_weight"] += p.weight

    total_avail = sum(s["available_weight"] for s in stats.values())

    categories_summary = [
        StockCategorySummary(
            category=cat,
            available_weight=round(s["available_weight"], 2),
            total_purchased_weight=round(s["total_purchased_weight"], 2),
            pooled_weight=round(s["pooled_weight"], 2),
            completed_weight=round(s["completed_weight"], 2),
            purchase_count=int(s["purchase_count"])
        )
        for cat, s in stats.items()
    ]

    return StockResponse(
        total_available_weight=round(total_avail, 2),
        categories=categories_summary,
        items=categories_summary
    )
