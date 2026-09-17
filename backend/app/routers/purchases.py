import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_dealer
from app.core.config import SyncStatus, MaterialCategory
from app.models.user import User
from app.models.purchase import Purchase
from app.schemas.purchase import (
    PurchaseCreate,
    PurchaseResponse,
    SyncPurchasesRequest,
    SyncPurchasesResponse
)

router = APIRouter(prefix="/purchases", tags=["Purchases"])

@router.post("", response_model=PurchaseResponse, status_code=status.HTTP_201_CREATED)
def record_purchase(
    data: PurchaseCreate,
    current_dealer: User = Depends(get_current_dealer),
    db: Session = Depends(get_db)
):
    pid = data.purchase_id if data.purchase_id else str(uuid.uuid4())

    # Idempotency / Duplicate check
    existing = db.query(Purchase).filter(
        Purchase.purchase_id == pid,
        Purchase.dealer_id == current_dealer.id
    ).first()

    if existing:
        # Return existing without creating duplicate
        return existing

    unit_price = data.unit_price
    if unit_price is None and data.weight > 0:
        unit_price = round(data.price / data.weight, 2)

    created_at = data.created_at or datetime.now(timezone.utc)

    purchase = Purchase(
        purchase_id=pid,
        dealer_id=current_dealer.id,
        category=data.category.value,
        weight=data.weight,
        price=data.price,
        unit_price=unit_price,
        sync_status=SyncStatus.SYNCED.value,
        collector_reference=data.collector_reference,
        photo_url=data.photo_url,
        created_at=created_at,
        synced_at=datetime.now(timezone.utc)
    )
    db.add(purchase)
    db.commit()
    db.refresh(purchase)
    return purchase

@router.post("/sync", response_model=SyncPurchasesResponse)
def sync_offline_purchases(
    data: SyncPurchasesRequest,
    current_dealer: User = Depends(get_current_dealer),
    db: Session = Depends(get_db)
):
    synced_records = []
    new_count = 0
    existing_count = 0

    now_utc = datetime.now(timezone.utc)

    for item in data.purchases:
        pid = item.purchase_id if item.purchase_id else str(uuid.uuid4())

        existing = db.query(Purchase).filter(
            Purchase.purchase_id == pid,
            Purchase.dealer_id == current_dealer.id
        ).first()

        if existing:
            synced_records.append(existing)
            existing_count += 1
            continue

        unit_price = item.unit_price
        if unit_price is None and item.weight > 0:
            unit_price = round(item.price / item.weight, 2)

        created_at = item.created_at or now_utc

        purchase = Purchase(
            purchase_id=pid,
            dealer_id=current_dealer.id,
            category=item.category.value,
            weight=item.weight,
            price=item.price,
            unit_price=unit_price,
            sync_status=SyncStatus.SYNCED.value,
            collector_reference=item.collector_reference,
            photo_url=item.photo_url,
            created_at=created_at,
            synced_at=now_utc
        )
        db.add(purchase)
        synced_records.append(purchase)
        new_count += 1

    db.commit()

    for p in synced_records:
        db.refresh(p)

    return SyncPurchasesResponse(
        synced_count=new_count,
        existing_count=existing_count,
        purchases=synced_records
    )

@router.get("", response_model=List[PurchaseResponse])
def list_purchases(
    category: Optional[str] = Query(None),
    current_dealer: User = Depends(get_current_dealer),
    db: Session = Depends(get_db)
):
    query = db.query(Purchase).filter(Purchase.dealer_id == current_dealer.id)
    if category:
        query = query.filter(Purchase.category == category)
    return query.order_by(Purchase.created_at.desc()).all()
