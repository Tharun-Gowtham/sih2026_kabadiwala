"""
Comprehensive test suite for Milk-Run Neighborhood Aggregation Pooling.

Covers:
  1. Geohash stamping on lot creation with coordinates
  2. Threshold-based batch formation (≥20 kg)
  3. Below-threshold skip (no batch formed)
  4. Starvation fallback (lots older than BATCH_MAX_WAIT_HOURS)
  5. Recycler available batch listing
  6. Recycler batch acceptance + route reordering
  7. Role-based authorization (dealer cannot accept batches)
  8. Dispatch with ETA estimates
  9. Cancellation and lot state rollback
  10. End-to-end lifecycle: Lot → Batch → Accept → Dispatch → Handover → Batch COMPLETED
"""

import uuid
import pytest
from datetime import datetime, timezone, timedelta


# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────

DEALER_COORDS = {"latitude": 28.6280, "longitude": 77.1230}  # Mayapuri
DEALER_COORDS_2 = {"latitude": 28.6285, "longitude": 77.1235}  # Very close to first


def _make_purchase(client, token, category, weight, **extra):
    """Record a purchase to create stock for lot creation."""
    payload = {
        "purchase_id": extra.get("purchase_id", str(uuid.uuid4())),
        "category": category,
        "weight": weight,
        "price": weight * 100,
        "unit_price": 100.0,
        "collector_reference": "Test Collector",
    }
    res = client.post(
        "/api/purchases",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201, f"Purchase failed: {res.text}"
    return res.json()


def _make_lot(client, token, category, weight, lat=None, lng=None, recycler_id=None):
    """Create a lot, optionally with coordinates for batching."""
    payload = {
        "category": category,
        "declared_weight": weight,
    }
    if lat is not None:
        payload["latitude"] = lat
    if lng is not None:
        payload["longitude"] = lng
    if recycler_id:
        payload["recycler_id"] = recycler_id

    res = client.post(
        "/api/lots",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201, f"Lot creation failed: {res.text}"
    return res.json()


def _trigger_batch_formation(client, token):
    """Trigger POST /api/batches/form."""
    res = client.post(
        "/api/batches/form",
        headers={"Authorization": f"Bearer {token}"},
    )
    return res


# ──────────────────────────────────────────────────────────────
# Test 1: Geohash stamping
# ──────────────────────────────────────────────────────────────

def test_lot_creation_stamps_geohash(client, dealer_token):
    """When a lot is created with lat/lng, geohash_cell and batch_status are populated."""
    _make_purchase(client, dealer_token, "PCB", 5.0)

    lot = _make_lot(client, dealer_token, "PCB", 5.0, lat=28.6280, lng=77.1230)

    assert lot["geohash_cell"] is not None, "geohash_cell should be set"
    assert len(lot["geohash_cell"]) >= 4, "geohash should have reasonable precision"
    assert lot["batch_status"] is not None, "batch_status should be set"
    assert lot["latitude"] == 28.6280
    assert lot["longitude"] == 77.1230


def test_lot_creation_without_coords_no_geohash(client, dealer_token):
    """Lots without coordinates should have null geohash and null batch_status."""
    _make_purchase(client, dealer_token, "PCB", 5.0)

    lot = _make_lot(client, dealer_token, "PCB", 5.0)

    assert lot["geohash_cell"] is None
    assert lot["batch_status"] is None


# ──────────────────────────────────────────────────────────────
# Test 2: Threshold-based batch formation
# ──────────────────────────────────────────────────────────────

def test_batch_forms_at_threshold(client, dealer_token, recycler_token):
    """
    When total weight in a geohash cell reaches BATCH_THRESHOLD_KG (20kg),
    batch formation creates a READY batch.
    """
    # Seed 25kg of PCB stock
    _make_purchase(client, dealer_token, "PCB", 25.0)

    # Create a lot that exceeds threshold (auto-batch is ON)
    lot = _make_lot(client, dealer_token, "PCB", 22.0, lat=28.6280, lng=77.1230)

    # Check that a batch was auto-formed
    res = client.get(
        "/api/batches/available",
        headers={"Authorization": f"Bearer {recycler_token}"},
    )
    assert res.status_code == 200
    batches = res.json()
    assert len(batches) >= 1, "At least one batch should have formed"

    batch = batches[0]
    assert batch["status"] == "READY"
    assert batch["total_weight_kg"] >= 20.0
    assert batch["material_category"] == "PCB"


# ──────────────────────────────────────────────────────────────
# Test 3: Below-threshold → no batch
# ──────────────────────────────────────────────────────────────

def test_below_threshold_no_batch(client, dealer_token, recycler_token):
    """
    If total weight is below threshold and not starved, no batch should form.
    """
    _make_purchase(client, dealer_token, "Cable", 10.0)

    # Create a 10kg lot — below 20kg threshold
    _make_lot(client, dealer_token, "Cable", 10.0, lat=28.6280, lng=77.1230)

    # Manually trigger batch formation
    form_res = _trigger_batch_formation(client, dealer_token)
    assert form_res.status_code == 200
    # 0 new batches (the lot isn't old enough and weight < 20)
    # Check available batches for Cable
    res = client.get(
        "/api/batches/available?category=Cable",
        headers={"Authorization": f"Bearer {recycler_token}"},
    )
    assert res.status_code == 200
    cable_batches = [b for b in res.json() if b["material_category"] == "Cable"]
    assert len(cable_batches) == 0, "No Cable batch should form below threshold"


# ──────────────────────────────────────────────────────────────
# Test 4: Starvation fallback
# ──────────────────────────────────────────────────────────────

def test_starvation_fallback_forms_batch(client, dealer_token, recycler_token, db_session):
    """
    If a lot has been waiting longer than BATCH_MAX_WAIT_HOURS,
    batch formation should trigger even below threshold.
    """
    from app.models.lot import Lot

    _make_purchase(client, dealer_token, "Battery", 10.0)

    lot_data = _make_lot(client, dealer_token, "Battery", 10.0, lat=28.6280, lng=77.1230)

    # Manually backdate the lot's created_at to trigger starvation
    lot = db_session.query(Lot).filter(Lot.lot_id == lot_data["lot_id"]).first()
    lot.created_at = datetime.now(timezone.utc) - timedelta(hours=50)
    db_session.commit()

    # Trigger batch formation
    form_res = _trigger_batch_formation(client, dealer_token)
    assert form_res.status_code == 200

    # Check that a Battery batch now exists
    res = client.get(
        "/api/batches/available",
        headers={"Authorization": f"Bearer {recycler_token}"},
    )
    assert res.status_code == 200
    battery_batches = [b for b in res.json() if b["material_category"] == "Battery"]
    assert len(battery_batches) >= 1, "Starvation fallback should have formed a batch"


# ──────────────────────────────────────────────────────────────
# Test 5: Recycler available batch listing
# ──────────────────────────────────────────────────────────────

def test_recycler_lists_available_batches(client, dealer_token, recycler_token):
    """Recycler can list available (READY) batches and filter by category."""
    _make_purchase(client, dealer_token, "PCB", 25.0)
    _make_lot(client, dealer_token, "PCB", 22.0, lat=28.6280, lng=77.1230)

    res = client.get(
        "/api/batches/available?category=PCB",
        headers={"Authorization": f"Bearer {recycler_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    for b in data:
        assert b["material_category"] == "PCB"
        assert b["status"] == "READY"


# ──────────────────────────────────────────────────────────────
# Test 6: Batch acceptance + route reorder
# ──────────────────────────────────────────────────────────────

def test_recycler_accepts_batch(client, dealer_token, recycler_token):
    """
    Recycler accepts a READY batch → batch goes to ASSIGNED,
    and member lots become PENDING_HANDOVER.
    """
    _make_purchase(client, dealer_token, "PCB", 25.0)
    lot_data = _make_lot(client, dealer_token, "PCB", 22.0, lat=28.6280, lng=77.1230)

    # Get the batch
    res = client.get(
        "/api/batches/available",
        headers={"Authorization": f"Bearer {recycler_token}"},
    )
    batches = res.json()
    assert len(batches) >= 1
    batch_id = batches[0]["batch_id"]

    # Accept it
    accept_res = client.post(
        f"/api/batches/{batch_id}/accept",
        headers={"Authorization": f"Bearer {recycler_token}"},
    )
    assert accept_res.status_code == 200
    batch = accept_res.json()
    assert batch["status"] == "ASSIGNED"
    assert batch["recycler_id"] is not None

    # Verify the lot moved to PENDING_HANDOVER
    lot_res = client.get(
        f"/api/lots/{lot_data['lot_id']}",
        headers={"Authorization": f"Bearer {recycler_token}"},
    )
    assert lot_res.status_code == 200
    assert lot_res.json()["status"] == "PENDING_HANDOVER"


# ──────────────────────────────────────────────────────────────
# Test 7: Role-based authorization (dealer cannot accept batch)
# ──────────────────────────────────────────────────────────────

def test_dealer_cannot_accept_batch(client, dealer_token, recycler_token):
    """A dealer token should be rejected when trying to accept a batch."""
    _make_purchase(client, dealer_token, "PCB", 25.0)
    _make_lot(client, dealer_token, "PCB", 22.0, lat=28.6280, lng=77.1230)

    res = client.get(
        "/api/batches/available",
        headers={"Authorization": f"Bearer {recycler_token}"},
    )
    batches = res.json()
    assert len(batches) >= 1
    batch_id = batches[0]["batch_id"]

    # Dealer tries to accept — should fail (requires recycler role)
    accept_res = client.post(
        f"/api/batches/{batch_id}/accept",
        headers={"Authorization": f"Bearer {dealer_token}"},
    )
    # The accept endpoint requires get_current_recycler → should 403 or 401
    assert accept_res.status_code in (401, 403), f"Dealer should not be able to accept. Got: {accept_res.status_code}"


# ──────────────────────────────────────────────────────────────
# Test 8: Dispatch with ETA estimates
# ──────────────────────────────────────────────────────────────

def test_dispatch_generates_etas(client, dealer_token, recycler_token):
    """
    After accepting, recycler dispatches the batch → ETAs are computed
    and batch transitions to DISPATCHED.
    """
    _make_purchase(client, dealer_token, "PCB", 25.0)
    _make_lot(client, dealer_token, "PCB", 22.0, lat=28.6280, lng=77.1230)

    res = client.get(
        "/api/batches/available",
        headers={"Authorization": f"Bearer {recycler_token}"},
    )
    batch_id = res.json()[0]["batch_id"]

    # Accept
    client.post(
        f"/api/batches/{batch_id}/accept",
        headers={"Authorization": f"Bearer {recycler_token}"},
    )

    # Dispatch
    dispatch_res = client.post(
        f"/api/batches/{batch_id}/dispatch",
        headers={"Authorization": f"Bearer {recycler_token}"},
    )
    assert dispatch_res.status_code == 200
    data = dispatch_res.json()
    assert data["status"] == "DISPATCHED"
    assert data["pickup_scheduled_at"] is not None
    assert data["fcm_notifications_sent"] >= 1  # At least 1 dealer notified (stub mode)

    # Verify route has ETAs
    route_res = client.get(
        f"/api/batches/{batch_id}/route",
        headers={"Authorization": f"Bearer {recycler_token}"},
    )
    assert route_res.status_code == 200
    route = route_res.json()
    assert route["total_stops"] >= 1
    for stop in route["route"]:
        assert "estimated_arrival_minutes" in stop


# ──────────────────────────────────────────────────────────────
# Test 9: Cancellation and state rollback
# ──────────────────────────────────────────────────────────────

def test_cancel_reverts_batch_and_lots(client, dealer_token, recycler_token):
    """
    After accepting, recycler cancels → batch goes back to READY,
    and member lots revert to POOLED.
    """
    _make_purchase(client, dealer_token, "PCB", 25.0)
    lot_data = _make_lot(client, dealer_token, "PCB", 22.0, lat=28.6280, lng=77.1230)

    res = client.get(
        "/api/batches/available",
        headers={"Authorization": f"Bearer {recycler_token}"},
    )
    batch_id = res.json()[0]["batch_id"]

    # Accept
    client.post(
        f"/api/batches/{batch_id}/accept",
        headers={"Authorization": f"Bearer {recycler_token}"},
    )

    # Cancel
    cancel_res = client.post(
        f"/api/batches/{batch_id}/cancel",
        headers={"Authorization": f"Bearer {recycler_token}"},
    )
    assert cancel_res.status_code == 200
    batch = cancel_res.json()
    assert batch["status"] == "READY"
    assert batch["recycler_id"] is None

    # Verify lot reverted to POOLED
    lot_res = client.get(
        f"/api/lots/{lot_data['lot_id']}",
        headers={"Authorization": f"Bearer {dealer_token}"},
    )
    assert lot_res.status_code == 200
    assert lot_res.json()["status"] == "POOLED"


# ──────────────────────────────────────────────────────────────
# Test 10: End-to-end lifecycle
# ──────────────────────────────────────────────────────────────

def test_end_to_end_batch_lifecycle(client, dealer_token, recycler_token):
    """
    Full lifecycle:
      1. Create purchases → lots with coords
      2. Auto-batch formation → READY batch
      3. Recycler accepts → ASSIGNED, lots → PENDING_HANDOVER
      4. Recycler dispatches → DISPATCHED + FCM stubs
      5. Handover confirm all lots → lot COMPLETED
      6. Batch auto-completes → COMPLETED
    """
    # Step 1: Create stock and lots
    _make_purchase(client, dealer_token, "PCB", 30.0)
    lot = _make_lot(client, dealer_token, "PCB", 25.0, lat=28.6280, lng=77.1230)

    # Step 2: Batch should have formed automatically
    res = client.get(
        "/api/batches/available",
        headers={"Authorization": f"Bearer {recycler_token}"},
    )
    batches = [b for b in res.json() if b["material_category"] == "PCB"]
    assert len(batches) >= 1
    batch_id = batches[0]["batch_id"]

    # Step 3: Accept
    accept_res = client.post(
        f"/api/batches/{batch_id}/accept",
        headers={"Authorization": f"Bearer {recycler_token}"},
    )
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] == "ASSIGNED"

    # Step 4: Dispatch
    dispatch_res = client.post(
        f"/api/batches/{batch_id}/dispatch",
        headers={"Authorization": f"Bearer {recycler_token}"},
    )
    assert dispatch_res.status_code == 200
    assert dispatch_res.json()["status"] == "DISPATCHED"

    # Step 5: Handover — verify + confirm the lot
    lot_id = lot["lot_id"]

    verify_res = client.post(
        f"/api/handover/verify/{lot_id}",
        json={"verified_weight": 24.5},
        headers={"Authorization": f"Bearer {recycler_token}"},
    )
    assert verify_res.status_code == 200

    confirm_res = client.post(
        f"/api/handover/confirm/{lot_id}",
        json={"verified_weight": 24.5, "notes": "E2E test confirmation"},
        headers={"Authorization": f"Bearer {recycler_token}"},
    )
    assert confirm_res.status_code == 200
    tx = confirm_res.json()
    assert tx["status"] == "COMPLETED"

    # Step 6: The lot is COMPLETED — check if batch auto-completed
    batch_res = client.get(
        f"/api/batches/{batch_id}",
        headers={"Authorization": f"Bearer {recycler_token}"},
    )
    assert batch_res.status_code == 200
    assert batch_res.json()["status"] == "COMPLETED", "Batch should auto-complete when all lots are confirmed"


# ──────────────────────────────────────────────────────────────
# Test 11: Batch detail and route endpoints
# ──────────────────────────────────────────────────────────────

def test_batch_detail_and_route(client, dealer_token, recycler_token):
    """GET /batches/{id} and GET /batches/{id}/route return correct structure."""
    _make_purchase(client, dealer_token, "PCB", 25.0)
    _make_lot(client, dealer_token, "PCB", 22.0, lat=28.6280, lng=77.1230)

    res = client.get(
        "/api/batches/available",
        headers={"Authorization": f"Bearer {recycler_token}"},
    )
    batch_id = res.json()[0]["batch_id"]

    # Detail
    detail_res = client.get(
        f"/api/batches/{batch_id}",
        headers={"Authorization": f"Bearer {recycler_token}"},
    )
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert "batch_id" in detail
    assert "lots" in detail
    assert detail["lot_count"] >= 1
    assert detail["centroid_lat"] is not None

    # Route
    route_res = client.get(
        f"/api/batches/{batch_id}/route",
        headers={"Authorization": f"Bearer {recycler_token}"},
    )
    assert route_res.status_code == 200
    route = route_res.json()
    assert route["total_stops"] >= 1
    assert route["total_distance_km"] >= 0.0
    assert len(route["route"]) >= 1
    for stop in route["route"]:
        assert "lot_id" in stop
        assert "lat" in stop
        assert "lng" in stop
        assert "stop_number" in stop


# ──────────────────────────────────────────────────────────────
# Test 12: My-batches endpoint for recycler
# ──────────────────────────────────────────────────────────────

def test_my_batches_lists_assigned(client, dealer_token, recycler_token):
    """GET /batches/my returns only batches assigned to the current recycler."""
    _make_purchase(client, dealer_token, "PCB", 25.0)
    _make_lot(client, dealer_token, "PCB", 22.0, lat=28.6280, lng=77.1230)

    res = client.get(
        "/api/batches/available",
        headers={"Authorization": f"Bearer {recycler_token}"},
    )
    batch_id = res.json()[0]["batch_id"]

    # Before accepting — my batches should be empty
    my_res = client.get(
        "/api/batches/my",
        headers={"Authorization": f"Bearer {recycler_token}"},
    )
    assert my_res.status_code == 200
    assert len(my_res.json()) == 0

    # Accept
    client.post(
        f"/api/batches/{batch_id}/accept",
        headers={"Authorization": f"Bearer {recycler_token}"},
    )

    # After accepting — my batches should have 1
    my_res = client.get(
        "/api/batches/my",
        headers={"Authorization": f"Bearer {recycler_token}"},
    )
    assert my_res.status_code == 200
    assert len(my_res.json()) >= 1
    assert my_res.json()[0]["batch_id"] == batch_id
