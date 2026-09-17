import uuid
import hashlib
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.dependencies import get_current_dealer
from app.core.config import SyncStatus, MaterialCategory, settings
from app.models.user import User
from app.models.purchase import Purchase
from app.services.audit_service import log_action
from app.services.fraud_detection import create_fraud_alert
from app.schemas.purchase import (
    PurchaseCreate,
    PurchaseResponse,
    SyncPurchasesRequest,
    SyncPurchasesResponse
)

router = APIRouter(prefix="/purchases", tags=["Purchases"])


# ── Fraud Prevention: Velocity Checks ──────────────────────────

def _check_velocity(db: Session, dealer: User):
    """
    Enforce physically realistic purchase rates:
      1. Max purchases per hour
      2. Min interval between consecutive purchases
      3. Max daily weight
    """
    now = datetime.now(timezone.utc)

    # 1. Max purchases per hour
    one_hour_ago = now - timedelta(hours=1)
    hourly_count = db.query(Purchase).filter(
        Purchase.dealer_id == dealer.id,
        Purchase.created_at >= one_hour_ago,
    ).count()

    if hourly_count >= settings.MAX_PURCHASES_PER_HOUR:
        create_fraud_alert(
            db, dealer.id, "VELOCITY_SPIKE", "HIGH",
            {"hourly_count": hourly_count, "limit": settings.MAX_PURCHASES_PER_HOUR}
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded: {hourly_count} purchases in the last hour "
                   f"(max {settings.MAX_PURCHASES_PER_HOUR}). "
                   "This limit exists to prevent fraudulent bulk submissions."
        )

    # 2. Min interval between purchases
    last_purchase = (
        db.query(Purchase)
        .filter(Purchase.dealer_id == dealer.id)
        .order_by(Purchase.created_at.desc())
        .first()
    )
    if last_purchase and last_purchase.created_at:
        last_ts = last_purchase.created_at
        if last_ts.tzinfo is None:
            last_ts = last_ts.replace(tzinfo=timezone.utc)
        elapsed = (now - last_ts).total_seconds()
        if elapsed < settings.MIN_PURCHASE_INTERVAL_SECONDS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too fast: {elapsed:.0f}s since last purchase "
                       f"(minimum {settings.MIN_PURCHASE_INTERVAL_SECONDS}s required)."
            )

    # 3. Max daily weight
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    daily_weight = db.query(func.coalesce(func.sum(Purchase.weight), 0.0)).filter(
        Purchase.dealer_id == dealer.id,
        Purchase.created_at >= day_start,
    ).scalar()

    if daily_weight >= settings.MAX_DAILY_WEIGHT_KG:
        create_fraud_alert(
            db, dealer.id, "WEIGHT_ANOMALY", "HIGH",
            {"daily_weight_kg": float(daily_weight), "limit": settings.MAX_DAILY_WEIGHT_KG}
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily weight limit reached: {daily_weight:.1f} kg today "
                   f"(max {settings.MAX_DAILY_WEIGHT_KG:.0f} kg/day)."
        )


def _check_photo_requirement(weight: float, photo_url: Optional[str]):
    """Enforce photo proof for purchases above threshold weight."""
    if weight >= settings.PHOTO_REQUIRED_WEIGHT_KG and not photo_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Photo proof is required for purchases >= {settings.PHOTO_REQUIRED_WEIGHT_KG} kg. "
                   f"This purchase is {weight:.2f} kg. Please attach a photo."
        )


def _compute_photo_hash(photo_url: Optional[str]) -> Optional[str]:
    """Compute SHA-256 hash of the photo URL for tamper detection."""
    if not photo_url:
        return None
    return hashlib.sha256(photo_url.encode("utf-8")).hexdigest()


@router.post("", response_model=PurchaseResponse, status_code=status.HTTP_201_CREATED)
def record_purchase(
    data: PurchaseCreate,
    request: Request,
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

    # ── Fraud Prevention Checks ──
    _check_velocity(db, current_dealer)
    _check_photo_requirement(data.weight, data.photo_url)

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
        synced_at=datetime.now(timezone.utc),
        # ── Fraud Detection Fields ──
        photo_hash=_compute_photo_hash(data.photo_url),
        gps_latitude=getattr(data, 'gps_latitude', None),
        gps_longitude=getattr(data, 'gps_longitude', None),
    )
    db.add(purchase)

    # ── Audit Trail ──
    log_action(
        db=db,
        actor_id=current_dealer.id,
        actor_role=current_dealer.role,
        action="PURCHASE_CREATED",
        entity_type="Purchase",
        entity_id=pid,
        details={
            "category": data.category.value,
            "weight": data.weight,
            "price": data.price,
            "has_photo": bool(data.photo_url),
        },
        ip_address=request.client.host if request.client else None,
    )

    db.commit()
    db.refresh(purchase)
    return purchase

@router.post("/sync", response_model=SyncPurchasesResponse)
def sync_offline_purchases(
    data: SyncPurchasesRequest,
    request: Request,
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
            synced_at=now_utc,
            photo_hash=_compute_photo_hash(item.photo_url),
            gps_latitude=getattr(item, 'gps_latitude', None),
            gps_longitude=getattr(item, 'gps_longitude', None),
        )
        db.add(purchase)

        # ── Audit Trail for synced purchases ──
        log_action(
            db=db,
            actor_id=current_dealer.id,
            actor_role=current_dealer.role,
            action="PURCHASE_SYNCED",
            entity_type="Purchase",
            entity_id=pid,
            details={
                "category": item.category.value,
                "weight": item.weight,
                "price": item.price,
                "has_photo": bool(item.photo_url),
                "offline_sync": True,
            },
            ip_address=request.client.host if request.client else None,
        )

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

