"""
Batches Router — Milk-Run Neighborhood Aggregation Pooling
==========================================================

Endpoints:
  POST /batches/form               Trigger batch formation (admin / cron / auto)
  GET  /batches                    List all batches (recycler or admin)
  GET  /batches/available          List READY batches a recycler can accept
  GET  /batches/my                 List batches assigned to the current recycler
  GET  /batches/{batch_id}         Full batch detail including route
  POST /batches/{batch_id}/accept  Recycler claims a READY batch
  POST /batches/{batch_id}/dispatch  Recycler dispatches van (computes ETAs + FCM)
  POST /batches/{batch_id}/cancel  Recycler cancels an ASSIGNED batch
  GET  /batches/{batch_id}/route   Fetch ordered route stops
"""

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import BatchStatus, UserRole
from app.core.dependencies import get_current_recycler, get_current_user
from app.models.user import User
from app.models.batch import Batch, BatchLot
from app.models.lot import Lot
from app.services import batch_service, compute_route_distance_km
from app.services.fcm_service import send_pickup_call_notifications
from app.schemas.batch import (
    BatchResponse,
    BatchListItem,
    BatchFormResult,
    BatchDispatchResponse,
    BatchRouteResponse,
    RouteStop,
)

router = APIRouter(prefix="/batches", tags=["Batches (Milk-Run)"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_batch_response(batch: Batch) -> BatchResponse:
    """Convert ORM Batch → BatchResponse schema."""
    lot_items = []
    for bl in batch.batch_lots:
        lot = bl.lot
        if lot:
            lot_items.append({
                "lot_id": lot.lot_id,
                "dealer_id": lot.dealer_id,
                "dealer_name": lot.dealer.name if lot.dealer else None,
                "declared_weight": lot.declared_weight,
                "lat": lot.latitude,
                "lng": lot.longitude,
            })

    return BatchResponse(
        batch_id=batch.batch_id,
        material_category=batch.material_category,
        geohash_cell=batch.geohash_cell,
        status=batch.status,
        total_weight_kg=batch.total_weight_kg,
        lot_count=len(batch.batch_lots),
        recycler_id=batch.recycler_id,
        recycler_name=batch.recycler.name if batch.recycler else None,
        centroid_lat=batch.centroid_lat,
        centroid_lon=batch.centroid_lon,
        route_json=batch.route_json,
        pickup_scheduled_at=batch.pickup_scheduled_at,
        created_at=batch.created_at,
        updated_at=batch.updated_at,
        lots=lot_items,
    )


# ---------------------------------------------------------------------------
# POST /batches/form  — Trigger batch formation
# ---------------------------------------------------------------------------

@router.post("/form", response_model=BatchFormResult, status_code=status.HTTP_200_OK)
def trigger_batch_formation(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Trigger the milk-run batch formation algorithm.
    Scans all POOLED lots with coordinates and clusters them by (category, geohash_cell).
    Batches are formed when weight >= threshold OR oldest lot has waited >= starvation timeout.

    Can be called by any authenticated user (recycler or dealer). In production this
    would typically be triggered by a background scheduler.
    """
    batches_formed = batch_service.form_batches(db)
    return BatchFormResult(
        batches_formed=batches_formed,
        message=(
            f"Batch formation complete. {batches_formed} new batch(es) created."
            if batches_formed > 0
            else "No new batches formed. All lot groups are below threshold and not yet starved."
        ),
    )


# ---------------------------------------------------------------------------
# GET /batches/available  — READY batches a recycler can accept
# Must be declared before /{batch_id} to avoid route shadowing
# ---------------------------------------------------------------------------

@router.get("/available", response_model=List[BatchListItem])
def list_available_batches(
    category: Optional[str] = Query(None, description="Filter by material category"),
    current_recycler: User = Depends(get_current_recycler),
    db: Session = Depends(get_db),
):
    """List all READY batches that a recycler can accept."""
    query = db.query(Batch).filter(Batch.status == BatchStatus.READY.value)
    if category:
        query = query.filter(Batch.material_category == category)
    batches = query.order_by(Batch.created_at.desc()).all()

    return [
        BatchListItem(
            batch_id=b.batch_id,
            material_category=b.material_category,
            geohash_cell=b.geohash_cell,
            total_weight_kg=b.total_weight_kg,
            num_stops=len(b.batch_lots),
            status=b.status,
            centroid_lat=b.centroid_lat,
            centroid_lon=b.centroid_lon,
            pickup_scheduled_at=b.pickup_scheduled_at,
            created_at=b.created_at,
        )
        for b in batches
    ]


# ---------------------------------------------------------------------------
# GET /batches/my  — Batches assigned to the current recycler
# ---------------------------------------------------------------------------

@router.get("/my", response_model=List[BatchListItem])
def list_my_batches(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by batch status"),
    current_recycler: User = Depends(get_current_recycler),
    db: Session = Depends(get_db),
):
    """List batches assigned to (or dispatched by) the current recycler."""
    query = db.query(Batch).filter(Batch.recycler_id == current_recycler.id)
    if status_filter:
        query = query.filter(Batch.status == status_filter)
    batches = query.order_by(Batch.updated_at.desc()).all()

    return [
        BatchListItem(
            batch_id=b.batch_id,
            material_category=b.material_category,
            geohash_cell=b.geohash_cell,
            total_weight_kg=b.total_weight_kg,
            num_stops=len(b.batch_lots),
            status=b.status,
            centroid_lat=b.centroid_lat,
            centroid_lon=b.centroid_lon,
            pickup_scheduled_at=b.pickup_scheduled_at,
            created_at=b.created_at,
        )
        for b in batches
    ]


# ---------------------------------------------------------------------------
# GET /batches  — List all batches (recycler scope)
# ---------------------------------------------------------------------------

@router.get("", response_model=List[BatchListItem])
def list_batches(
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = Query(None),
    current_recycler: User = Depends(get_current_recycler),
    db: Session = Depends(get_db),
):
    """List all batches (for recycler dashboard overview)."""
    query = db.query(Batch)
    if status_filter:
        query = query.filter(Batch.status == status_filter)
    if category:
        query = query.filter(Batch.material_category == category)
    batches = query.order_by(Batch.created_at.desc()).all()

    return [
        BatchListItem(
            batch_id=b.batch_id,
            material_category=b.material_category,
            geohash_cell=b.geohash_cell,
            total_weight_kg=b.total_weight_kg,
            num_stops=len(b.batch_lots),
            status=b.status,
            centroid_lat=b.centroid_lat,
            centroid_lon=b.centroid_lon,
            pickup_scheduled_at=b.pickup_scheduled_at,
            created_at=b.created_at,
        )
        for b in batches
    ]


# ---------------------------------------------------------------------------
# GET /batches/{batch_id}  — Full batch detail
# ---------------------------------------------------------------------------

@router.get("/{batch_id}", response_model=BatchResponse)
def get_batch(
    batch_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve full batch details including member lots and route."""
    batch = db.query(Batch).filter(Batch.batch_id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")

    # Recyclers can only see batches they're assigned to or that are READY
    if current_user.role == UserRole.RECYCLER.value:
        if batch.status == BatchStatus.READY.value:
            pass  # Anyone can view ready batches
        elif batch.recycler_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this batch")

    return _build_batch_response(batch)


# ---------------------------------------------------------------------------
# POST /batches/{batch_id}/accept  — Recycler claims a READY batch
# ---------------------------------------------------------------------------

@router.post("/{batch_id}/accept", response_model=BatchResponse)
def accept_batch(
    batch_id: str,
    current_recycler: User = Depends(get_current_recycler),
    db: Session = Depends(get_db),
):
    """
    Recycler accepts a READY batch.
    - Batch transitions: READY → ASSIGNED
    - All member lots transition: POOLED → PENDING_HANDOVER, recycler_id assigned
    - Route is re-ordered from the recycler's actual location (if known)
    """
    batch = db.query(Batch).filter(Batch.batch_id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")

    if batch.status != BatchStatus.READY.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Batch is not available for acceptance (status: {batch.status})"
        )

    try:
        batch = batch_service.assign_recycler_to_batch(db, batch_id, current_recycler.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Update all member lots → PENDING_HANDOVER with recycler assigned
    from app.core.config import LotStatus
    for bl in batch.batch_lots:
        lot = bl.lot
        if lot and lot.status == LotStatus.POOLED.value:
            lot.status = LotStatus.PENDING_HANDOVER.value
            lot.recycler_id = current_recycler.id
            lot.batch_status = "dispatched"
            lot.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(batch)

    return _build_batch_response(batch)


# ---------------------------------------------------------------------------
# POST /batches/{batch_id}/dispatch  — Recycler dispatches van
# ---------------------------------------------------------------------------

@router.post("/{batch_id}/dispatch", response_model=BatchDispatchResponse)
def dispatch_batch(
    batch_id: str,
    current_recycler: User = Depends(get_current_recycler),
    db: Session = Depends(get_db),
):
    """
    Recycler indicates the van has departed.
    - Recomputes per-stop ETAs based on route distance and average speed.
    - Batch transitions: ASSIGNED → DISPATCHED.
    - Sends FCM push notifications to each dealer in the route.
    """
    batch = db.query(Batch).filter(Batch.batch_id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")

    if batch.recycler_id != current_recycler.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not the assigned recycler")

    try:
        batch, dealer_ids = batch_service.dispatch_batch(db, batch_id, current_recycler.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Send FCM push notifications
    fcm_sent = send_pickup_call_notifications(
        db=db,
        dealer_ids=dealer_ids,
        batch_id=batch_id,
        route=batch.route_json or [],
        pickup_scheduled_at=batch.pickup_scheduled_at,
    )

    return BatchDispatchResponse(
        batch_id=batch.batch_id,
        status=batch.status,
        pickup_scheduled_at=batch.pickup_scheduled_at,
        fcm_notifications_sent=fcm_sent,
        message=f"Batch dispatched. {fcm_sent} dealer notification(s) sent.",
    )


# ---------------------------------------------------------------------------
# POST /batches/{batch_id}/cancel  — Recycler cancels batch assignment
# ---------------------------------------------------------------------------

@router.post("/{batch_id}/cancel", response_model=BatchResponse)
def cancel_batch(
    batch_id: str,
    current_recycler: User = Depends(get_current_recycler),
    db: Session = Depends(get_db),
):
    """
    Recycler cancels after accepting.
    - Batch transitions: ASSIGNED → READY (available for another recycler).
    - All member lots revert: PENDING_HANDOVER → POOLED, recycler_id cleared.
    """
    batch = db.query(Batch).filter(Batch.batch_id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")

    if batch.recycler_id != current_recycler.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not the assigned recycler")

    try:
        batch = batch_service.cancel_batch_assignment(db, batch_id, current_recycler.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Revert all member lots back to POOLED
    from app.core.config import LotStatus
    for bl in batch.batch_lots:
        lot = bl.lot
        if lot and lot.status == LotStatus.PENDING_HANDOVER.value:
            lot.status = LotStatus.POOLED.value
            lot.recycler_id = None
            lot.batch_status = "batched"
            lot.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(batch)

    return _build_batch_response(batch)


# ---------------------------------------------------------------------------
# GET /batches/{batch_id}/route  — Ordered route with stop details
# ---------------------------------------------------------------------------

@router.get("/{batch_id}/route", response_model=BatchRouteResponse)
def get_batch_route(
    batch_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the ordered, stop-by-stop route for a batch with distance summary."""
    batch = db.query(Batch).filter(Batch.batch_id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")

    route_raw = batch.route_json or []
    stops = [
        RouteStop(
            lot_id=s.get("lot_id", ""),
            lat=s.get("lat", 0.0),
            lng=s.get("lng", 0.0),
            dealer_name=s.get("dealer_name", ""),
            stop_number=s.get("stop_number", i + 1),
            estimated_arrival_minutes=s.get("estimated_arrival_minutes"),
        )
        for i, s in enumerate(route_raw)
    ]

    dist_km = compute_route_distance_km(route_raw)

    return BatchRouteResponse(
        batch_id=batch.batch_id,
        total_stops=len(stops),
        total_distance_km=dist_km,
        route=stops,
    )
