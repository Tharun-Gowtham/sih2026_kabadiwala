"""
Batch Service — Milk-Run Neighborhood Aggregation Pooling
=========================================================

Core business logic for:
  1. Clustering unbatched lots by (category, geohash_cell)
  2. Forming batches when weight threshold OR starvation timer is hit
  3. Nearest-neighbor route ordering
  4. Recycler assignment and batch dispatch

All functions receive a SQLAlchemy Session and return plain Python
data structures (no FastAPI coupling) so they can be called from
both the API router and from a future background scheduler.
"""

import uuid
import math
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Tuple, Optional
from collections import defaultdict

from sqlalchemy.orm import Session

from app.core.config import settings, BatchStatus
from app.models.lot import Lot
from app.models.batch import Batch, BatchLot
from app.models.user import User
from app.models.recycler import RecyclerProfile
from app.services.matching import haversine_distance_km

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _compute_centroid(lats: List[float], lons: List[float]) -> Tuple[float, float]:
    """Return (avg_lat, avg_lon) — the geographic centroid of all lot locations."""
    return (sum(lats) / len(lats), sum(lons) / len(lons))


def _nearest_neighbor_route(
    start_lat: float,
    start_lon: float,
    stops: List[Dict]
) -> List[Dict]:
    """
    Greedy nearest-neighbor heuristic.

    stops: list of {"lot_id", "lat", "lng", "dealer_name"}
    Returns the same list reordered so that each successive stop is
    the closest remaining stop to the current position.
    """
    remaining = list(stops)
    route: List[Dict] = []
    current_lat, current_lon = start_lat, start_lon

    while remaining:
        closest_idx = min(
            range(len(remaining)),
            key=lambda i: haversine_distance_km(
                current_lat, current_lon,
                remaining[i]["lat"], remaining[i]["lng"]
            )
        )
        next_stop = remaining.pop(closest_idx)
        route.append(next_stop)
        current_lat = next_stop["lat"]
        current_lon = next_stop["lng"]

    return route


def compute_route_distance_km(route: List[Dict]) -> float:
    """
    Sum of Haversine distances between consecutive stops (including
    an implicit return from origin — not added here since it's for
    display only, not billing).
    """
    if len(route) < 2:
        return 0.0
    total = 0.0
    for i in range(len(route) - 1):
        total += haversine_distance_km(
            route[i]["lat"], route[i]["lng"],
            route[i + 1]["lat"], route[i + 1]["lng"]
        )
    return round(total, 2)


def _estimate_arrival_minutes(distance_from_start_km: float) -> int:
    """
    Estimate travel time in minutes based on cumulative route distance
    and the configured average van speed.
    """
    hours = distance_from_start_km / settings.BATCH_AVG_SPEED_KMH
    return max(1, round(hours * 60))


# ---------------------------------------------------------------------------
# Step 1 + 2 — Batch Formation
# ---------------------------------------------------------------------------

def form_batches(db: Session) -> int:
    """
    Scan all unbatched lots that have coordinates, group them by
    (material_category, geohash_cell), and form batches when:
      - total weight >= BATCH_THRESHOLD_KG, OR
      - the oldest lot in the group has been waiting > BATCH_MAX_WAIT_HOURS
        (starvation fallback — ensures low-density areas aren't skipped forever)

    Returns: number of new batches created.
    """
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=settings.BATCH_MAX_WAIT_HOURS)

    # Only consider lots that: have a geohash cell, are unbatched, and are in
    # POOLED status (not yet individually assigned to a recycler)
    unbatched_lots: List[Lot] = (
        db.query(Lot)
        .filter(
            Lot.batch_status == "unbatched",
            Lot.geohash_cell.isnot(None),
            Lot.status == "POOLED",
        )
        .all()
    )

    if not unbatched_lots:
        logger.info("form_batches: no unbatched lots with coordinates found. Seeding demo POOLED lots.")
        from app.services.geohash_service import encode_geohash
        from app.core.config import MaterialCategory, LotStatus
        dealer = db.query(User).filter(User.role == "DEALER").first()
        dealer_id = dealer.id if dealer else str(uuid.uuid4())

        cell_mayapuri = encode_geohash(28.6280, 77.1230, precision=6)
        cell_okhla = encode_geohash(28.5380, 77.2710, precision=6)

        demo_pooled = [
            Lot(
                lot_id="LOT-DEMO-MAYAPURI-01",
                dealer_id=dealer_id,
                category=MaterialCategory.PCB.value,
                declared_weight=18.5,
                status=LotStatus.POOLED.value,
                batch_status="unbatched",
                latitude=28.6280,
                longitude=77.1230,
                geohash_cell=cell_mayapuri,
                created_at=now - timedelta(hours=3),
                updated_at=now - timedelta(hours=3)
            ),
            Lot(
                lot_id="LOT-DEMO-MAYAPURI-02",
                dealer_id=dealer_id,
                category=MaterialCategory.PCB.value,
                declared_weight=15.0,
                status=LotStatus.POOLED.value,
                batch_status="unbatched",
                latitude=28.6295,
                longitude=77.1245,
                geohash_cell=cell_mayapuri,
                created_at=now - timedelta(hours=2),
                updated_at=now - timedelta(hours=2)
            ),
            Lot(
                lot_id="LOT-DEMO-MAYAPURI-03",
                dealer_id=dealer_id,
                category=MaterialCategory.PCB.value,
                declared_weight=14.0,
                status=LotStatus.POOLED.value,
                batch_status="unbatched",
                latitude=28.6260,
                longitude=77.1210,
                geohash_cell=cell_mayapuri,
                created_at=now - timedelta(hours=1),
                updated_at=now - timedelta(hours=1)
            ),
            Lot(
                lot_id="LOT-DEMO-OKHLA-01",
                dealer_id=dealer_id,
                category=MaterialCategory.CABLE.value,
                declared_weight=30.0,
                status=LotStatus.POOLED.value,
                batch_status="unbatched",
                latitude=28.5380,
                longitude=77.2710,
                geohash_cell=cell_okhla,
                created_at=now - timedelta(hours=4),
                updated_at=now - timedelta(hours=4)
            ),
            Lot(
                lot_id="LOT-DEMO-OKHLA-02",
                dealer_id=dealer_id,
                category=MaterialCategory.CABLE.value,
                declared_weight=22.0,
                status=LotStatus.POOLED.value,
                batch_status="unbatched",
                latitude=28.5395,
                longitude=77.2730,
                geohash_cell=cell_okhla,
                created_at=now - timedelta(hours=2),
                updated_at=now - timedelta(hours=2)
            ),
        ]
        db.add_all(demo_pooled)
        db.commit()

        unbatched_lots = (
            db.query(Lot)
            .filter(
                Lot.batch_status == "unbatched",
                Lot.geohash_cell.isnot(None),
                Lot.status == "POOLED",
            )
            .all()
        )

    # Group by (category, geohash_cell)
    groups: Dict[Tuple[str, str], List[Lot]] = defaultdict(list)
    for lot in unbatched_lots:
        groups[(lot.category, lot.geohash_cell)].append(lot)

    batches_formed = 0

    for (category, cell), lots in groups.items():
        total_weight = sum(l.declared_weight for l in lots)
        oldest_created_at = min(
            # created_at may be offset-naive in older rows — normalise
            (l.created_at.replace(tzinfo=timezone.utc) if l.created_at.tzinfo is None else l.created_at)
            for l in lots
        )

        weight_threshold_met = total_weight >= settings.BATCH_THRESHOLD_KG
        starvation_triggered = oldest_created_at <= cutoff

        if not (weight_threshold_met or starvation_triggered):
            logger.debug(
                f"form_batches: cell={cell} cat={category} weight={total_weight:.1f}kg "
                f"— below threshold, not starved yet. Skipping."
            )
            continue

        reason = "weight_threshold" if weight_threshold_met else "starvation_fallback"
        logger.info(
            f"form_batches: forming batch for cell={cell} cat={category} "
            f"weight={total_weight:.1f}kg lots={len(lots)} reason={reason}"
        )

        # Compute centroid
        lats = [l.latitude for l in lots]
        lons = [l.longitude for l in lots]
        centroid_lat, centroid_lon = _compute_centroid(lats, lons)

        # Build stop list (no recycler start known yet — use centroid as proxy origin)
        raw_stops = [
            {
                "lot_id": l.lot_id,
                "lat": l.latitude,
                "lng": l.longitude,
                "dealer_name": l.dealer.name if l.dealer else "Unknown",
            }
            for l in lots
        ]
        ordered_stops = _nearest_neighbor_route(centroid_lat, centroid_lon, raw_stops)

        # Annotate with stop numbers (route will be re-ordered on dispatch with real recycler origin)
        for idx, stop in enumerate(ordered_stops, start=1):
            stop["stop_number"] = idx

        # Create the Batch row
        batch = Batch(
            batch_id=str(uuid.uuid4()),
            material_category=category,
            geohash_cell=cell,
            centroid_lat=round(centroid_lat, 6),
            centroid_lon=round(centroid_lon, 6),
            total_weight_kg=round(total_weight, 2),
            status=BatchStatus.READY.value,
            route_json=ordered_stops,
            created_at=now,
            updated_at=now,
        )
        db.add(batch)
        db.flush()  # get batch_id before creating join rows

        # Create BatchLot join rows and mark lots as batched
        for lot in lots:
            db.add(BatchLot(batch_id=batch.batch_id, lot_id=lot.lot_id))
            lot.batch_status = "batched"

        batches_formed += 1

    db.commit()
    logger.info(f"form_batches: committed {batches_formed} new batch(es).")
    return batches_formed


# ---------------------------------------------------------------------------
# Step 4 — Recycler Assignment
# ---------------------------------------------------------------------------

def assign_recycler_to_batch(db: Session, batch_id: str, recycler_id: str) -> Batch:
    """
    Recycler accepts a ready batch.
    Re-orders the route using the recycler's actual location as the start point.
    """
    batch = db.query(Batch).filter(Batch.batch_id == batch_id).first()
    if not batch:
        raise ValueError(f"Batch {batch_id} not found")
    if batch.status != BatchStatus.READY.value:
        raise ValueError(f"Batch {batch_id} is not in 'ready' state (current: {batch.status})")

    # Re-run nearest-neighbor from recycler's actual position
    recycler_profile = (
        db.query(RecyclerProfile)
        .filter(RecyclerProfile.user_id == recycler_id)
        .first()
    )
    recycler_user = db.query(User).filter(User.id == recycler_id).first()

    if recycler_profile and recycler_profile.latitude and recycler_profile.longitude:
        start_lat = recycler_profile.latitude
        start_lon = recycler_profile.longitude
    elif recycler_user and recycler_user.latitude and recycler_user.longitude:
        start_lat = recycler_user.latitude
        start_lon = recycler_user.longitude
    else:
        # Fall back to batch centroid — route order stays the same
        start_lat = batch.centroid_lat or 28.6139
        start_lon = batch.centroid_lon or 77.2090

    existing_stops = batch.route_json or []
    reordered = _nearest_neighbor_route(start_lat, start_lon, existing_stops)
    for idx, stop in enumerate(reordered, start=1):
        stop["stop_number"] = idx

    batch.route_json = reordered
    batch.recycler_id = recycler_id
    batch.status = BatchStatus.ASSIGNED.value
    batch.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(batch)
    return batch


# ---------------------------------------------------------------------------
# Step 5 — Dispatch and FCM trigger
# ---------------------------------------------------------------------------

def dispatch_batch(db: Session, batch_id: str, recycler_id: str) -> Tuple[Batch, List[str]]:
    """
    Recycler dispatches the batch van.

    1. Recomputes pickup_scheduled_at from route distance + avg speed.
    2. Sets status = dispatched.
    3. Returns (batch, [dealer_user_ids]) so the router can pass them to FCM.
    """
    batch = db.query(Batch).filter(Batch.batch_id == batch_id).first()
    if not batch:
        raise ValueError(f"Batch {batch_id} not found")
    if batch.status != BatchStatus.ASSIGNED.value:
        raise ValueError(
            f"Batch {batch_id} must be in 'assigned' state to dispatch (current: {batch.status})"
        )
    if batch.recycler_id != recycler_id:
        raise ValueError("You are not the assigned recycler for this batch")

    route = batch.route_json or []
    dist_km = compute_route_distance_km(route)
    travel_minutes = _estimate_arrival_minutes(dist_km)

    now = datetime.now(timezone.utc)
    pickup_time = now + timedelta(minutes=travel_minutes)

    # Annotate each stop with its estimated arrival time
    cumulative_dist = 0.0
    for i, stop in enumerate(route):
        if i == 0:
            stop["estimated_arrival_minutes"] = 5  # 5 min grace / loading time
        else:
            leg = haversine_distance_km(
                route[i - 1]["lat"], route[i - 1]["lng"],
                stop["lat"], stop["lng"]
            )
            cumulative_dist += leg
            stop["estimated_arrival_minutes"] = 5 + _estimate_arrival_minutes(cumulative_dist)

    batch.route_json = route
    batch.pickup_scheduled_at = pickup_time
    batch.status = BatchStatus.DISPATCHED.value
    batch.updated_at = now
    db.commit()
    db.refresh(batch)

    # Collect dealer_ids from all lots in this batch
    dealer_ids = [bl.lot.dealer_id for bl in batch.batch_lots if bl.lot]
    # Deduplicate (a dealer could have multiple lots in one batch)
    dealer_ids = list(set(dealer_ids))

    return batch, dealer_ids


# ---------------------------------------------------------------------------
# Cancellation (recycler backs out after accepting)
# ---------------------------------------------------------------------------

def cancel_batch_assignment(db: Session, batch_id: str, recycler_id: str) -> Batch:
    """
    Recycler cancels after accepting — batch goes back to 'ready'
    so another recycler can pick it up.
    """
    batch = db.query(Batch).filter(Batch.batch_id == batch_id).first()
    if not batch:
        raise ValueError(f"Batch {batch_id} not found")
    if batch.status != BatchStatus.ASSIGNED.value:
        raise ValueError(f"Only 'assigned' batches can be cancelled (current: {batch.status})")
    if batch.recycler_id != recycler_id:
        raise ValueError("You are not the assigned recycler for this batch")

    batch.recycler_id = None
    batch.status = BatchStatus.READY.value
    batch.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(batch)
    return batch


# ---------------------------------------------------------------------------
# Batch completion (called from handover flow when all lots confirmed)
# ---------------------------------------------------------------------------

def complete_batch(db: Session, batch_id: str) -> Batch:
    """Mark batch as completed once all physical handovers are done."""
    batch = db.query(Batch).filter(Batch.batch_id == batch_id).first()
    if not batch:
        raise ValueError(f"Batch {batch_id} not found")
    batch.status = BatchStatus.COMPLETED.value
    batch.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(batch)
    return batch
