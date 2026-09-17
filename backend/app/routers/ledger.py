from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_dealer
from app.core.config import LotStatus
from app.models.user import User
from app.models.purchase import Purchase
from app.models.lot import Lot
from app.models.transaction import Transaction
from app.schemas.transaction import DealerLedgerSummary, TransactionResponse
from app.schemas.lot import LotResponse
from app.schemas.purchase import PurchaseResponse

router = APIRouter(prefix="/dealers", tags=["Dealer Ledger"])

@router.get("/ledger", response_model=DealerLedgerSummary)
def get_dealer_ledger(
    current_dealer: User = Depends(get_current_dealer),
    db: Session = Depends(get_db)
):
    # 1. Purchases (Expenditure)
    purchases = db.query(Purchase).filter(
        Purchase.dealer_id == current_dealer.id
    ).order_by(Purchase.created_at.desc()).all()

    total_spent = sum(p.price for p in purchases)

    # 2. Confirmed Transactions (Earnings)
    transactions = db.query(Transaction).filter(
        Transaction.dealer_id == current_dealer.id
    ).order_by(Transaction.timestamp.desc()).all()

    total_sales = sum(tx.total_payout for tx in transactions)

    # 3. Pending Lots (NOT confirmed earnings)
    pending_lots = db.query(Lot).filter(
        Lot.dealer_id == current_dealer.id,
        Lot.status.in_([LotStatus.POOLED.value, LotStatus.PENDING_HANDOVER.value])
    ).order_by(Lot.created_at.desc()).all()

    total_pending_weight = sum(l.declared_weight for l in pending_lots)

    tx_responses = [
        TransactionResponse(
            transaction_id=t.transaction_id,
            lot_id=t.lot_id,
            dealer_id=t.dealer_id,
            dealer_name=current_dealer.name,
            recycler_id=t.recycler_id,
            recycler_name=t.recycler.name if t.recycler else None,
            category=t.category,
            declared_weight=t.declared_weight,
            verified_weight=t.verified_weight,
            discrepancy_percentage=t.discrepancy_percentage,
            rate_per_kg=t.rate_per_kg,
            total_payout=t.total_payout,
            status=t.status,
            timestamp=t.timestamp,
            notes=t.notes
        )
        for t in transactions
    ]

    pending_lot_responses = [
        LotResponse(
            lot_id=l.lot_id,
            dealer_id=l.dealer_id,
            dealer_name=current_dealer.name,
            category=l.category,
            declared_weight=l.declared_weight,
            recycler_id=l.recycler_id,
            recycler_name=l.recycler.name if l.recycler else None,
            status=l.status,
            created_at=l.created_at,
            updated_at=l.updated_at
        )
        for l in pending_lots
    ]

    purchase_responses = [
        PurchaseResponse(
            purchase_id=p.purchase_id,
            dealer_id=p.dealer_id,
            category=p.category,
            weight=p.weight,
            price=p.price,
            unit_price=p.unit_price,
            sync_status=p.sync_status,
            lot_id=p.lot_id,
            collector_reference=p.collector_reference,
            photo_url=p.photo_url,
            created_at=p.created_at,
            synced_at=p.synced_at
        )
        for p in purchases
    ]

    return DealerLedgerSummary(
        dealer_id=current_dealer.id,
        dealer_name=current_dealer.name,
        total_spent_on_purchases=round(total_spent, 2),
        total_confirmed_sales=round(total_sales, 2),
        total_pending_lot_weight=round(total_pending_weight, 2),
        confirmed_transactions_count=len(transactions),
        purchases_count=len(purchases),
        transactions=tx_responses,
        pending_lots=pending_lot_responses
    )
