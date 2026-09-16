import uuid
import pytest
from app.core.config import MaterialCategory, LotStatus

# Headers helper
def auth_header(token: str):
    return {"Authorization": f"Bearer {token}"}

# -------------------------------------------------------------
# 1. Valid Purchase Creation
# -------------------------------------------------------------
def test_valid_purchase(client, dealer_token):
    p_id = str(uuid.uuid4())
    payload = {
        "purchase_id": p_id,
        "category": "PCB",
        "weight": 12.5,
        "price": 5500.0,
        "collector_reference": "Collector Sunita"
    }
    res = client.post("/api/purchases", json=payload, headers=auth_header(dealer_token))
    assert res.status_code == 201
    data = res.json()
    assert data["purchase_id"] == p_id
    assert data["category"] == "PCB"
    assert data["weight"] == 12.5
    assert data["price"] == 5500.0
    assert data["sync_status"] == "SYNCED"

# -------------------------------------------------------------
# 2. Invalid Category Rejection (e.g. "PCB Board", "Cables")
# -------------------------------------------------------------
def test_invalid_category_rejection(client, dealer_token):
    payload = {
        "category": "PCB Board",  # Invalid! Must be "PCB"
        "weight": 10.0,
        "price": 4000.0
    }
    res = client.post("/api/purchases", json=payload, headers=auth_header(dealer_token))
    assert res.status_code == 422  # Unprocessable Entity (Pydantic validation)

    payload2 = {
        "category": "Cables",  # Invalid! Must be "Cable"
        "weight": 10.0,
        "price": 4000.0
    }
    res2 = client.post("/api/purchases", json=payload2, headers=auth_header(dealer_token))
    assert res2.status_code == 422

# -------------------------------------------------------------
# 3. Invalid Weight Rejection (Zero or Negative)
# -------------------------------------------------------------
def test_invalid_weight_rejection(client, dealer_token):
    payload_zero = {"category": "PCB", "weight": 0.0, "price": 1000.0}
    res = client.post("/api/purchases", json=payload_zero, headers=auth_header(dealer_token))
    assert res.status_code == 422

    payload_neg = {"category": "PCB", "weight": -5.0, "price": 1000.0}
    res_neg = client.post("/api/purchases", json=payload_neg, headers=auth_header(dealer_token))
    assert res_neg.status_code == 422

# -------------------------------------------------------------
# 4. Duplicate Purchase UUID Idempotency
# -------------------------------------------------------------
def test_duplicate_purchase_uuid_idempotency(client, dealer_token):
    p_id = str(uuid.uuid4())
    payload = {"purchase_id": p_id, "category": "Battery", "weight": 8.0, "price": 640.0}
    
    # First request
    res1 = client.post("/api/purchases", json=payload, headers=auth_header(dealer_token))
    assert res1.status_code == 201

    # Duplicate request with same UUID
    res2 = client.post("/api/purchases", json=payload, headers=auth_header(dealer_token))
    assert res2.status_code == 200 or res2.status_code == 201
    assert res2.json()["purchase_id"] == p_id

    # Verify purchase list contains only 1 purchase with this UUID
    list_res = client.get("/api/purchases", headers=auth_header(dealer_token))
    matching = [p for p in list_res.json() if p["purchase_id"] == p_id]
    assert len(matching) == 1

# -------------------------------------------------------------
# 5. Valid Lot Creation (Single Category)
# -------------------------------------------------------------
def test_valid_single_category_lot_creation(client, dealer_token):
    # Seed data has 30kg PCB available (10kg + 20kg)
    lot_uuid = str(uuid.uuid4())
    payload = {
        "lot_id": lot_uuid,
        "category": "PCB",
        "declared_weight": 25.0
    }
    res = client.post("/api/lots", json=payload, headers=auth_header(dealer_token))
    assert res.status_code == 201
    data = res.json()
    assert data["lot_id"] == lot_uuid
    assert data["category"] == "PCB"
    assert data["declared_weight"] == 25.0
    assert data["status"] == "POOLED"

# -------------------------------------------------------------
# 6. Mixed Category Lot Rejection
# -------------------------------------------------------------
def test_mixed_category_lot_rejection(client, dealer_token):
    # The schema strictly allows only one single category per lot
    payload = {
        "category": "InvalidMixed",
        "declared_weight": 20.0
    }
    res = client.post("/api/lots", json=payload, headers=auth_header(dealer_token))
    assert res.status_code == 422

# -------------------------------------------------------------
# 7. Material Already Pooled Rejection (Exceeding Available Stock)
# -------------------------------------------------------------
def test_material_already_pooled_rejection(client, dealer_token):
    # Available PCB is 30kg. Requesting 30kg will succeed.
    res1 = client.post("/api/lots", json={"category": "PCB", "declared_weight": 30.0}, headers=auth_header(dealer_token))
    assert res1.status_code == 201

    # Requesting another 10kg PCB should fail because stock is now pooled!
    res2 = client.post("/api/lots", json={"category": "PCB", "declared_weight": 10.0}, headers=auth_header(dealer_token))
    assert res2.status_code == 400
    assert "Insufficient available stock" in res2.json()["detail"]

# -------------------------------------------------------------
# 8. Recycler Matching Algorithm
# -------------------------------------------------------------
def test_recycler_matching_algorithm(client, dealer_token):
    # Query matching for PCB
    res = client.get("/api/recyclers/match?category=PCB", headers=auth_header(dealer_token))
    assert res.status_code == 200
    matches = res.json()
    assert len(matches) >= 2
    # Verify order is ranked descending by score
    scores = [m["score"] for m in matches]
    assert scores == sorted(scores, reverse=True)
    # Check that rank 1 exists
    assert matches[0]["rank"] == 1
    assert "score" in matches[0]
    assert "distance_km" in matches[0]

# -------------------------------------------------------------
# 9. Wrong Recycler Access Rejection
# -------------------------------------------------------------
def test_wrong_recycler_access_rejection(client, dealer_token, recycler_token, recycler2_token):
    # Dealer creates a lot and assigns to Recycler 1 (GreenCycle)
    recycler1_info = client.get("/api/auth/me", headers=auth_header(recycler_token)).json()
    r1_id = recycler1_info["id"]

    lot_res = client.post(
        "/api/lots",
        json={"category": "Cable", "declared_weight": 15.0, "recycler_id": r1_id},
        headers=auth_header(dealer_token)
    )
    assert lot_res.status_code == 201
    lot_id = lot_res.json()["lot_id"]

    # Recycler 2 (EcoRecover) attempts to verify or confirm this lot
    res_wrong_verify = client.post(
        f"/api/handover/verify/{lot_id}",
        json={"verified_weight": 15.0},
        headers=auth_header(recycler2_token)
    )
    assert res_wrong_verify.status_code == 403

    res_wrong_confirm = client.post(
        f"/api/handover/confirm/{lot_id}",
        json={"verified_weight": 15.0},
        headers=auth_header(recycler2_token)
    )
    assert res_wrong_confirm.status_code == 403

# -------------------------------------------------------------
# 10. Valid Weight Verification
# -------------------------------------------------------------
def test_valid_weight_verification(client, dealer_token, recycler_token):
    r1_id = client.get("/api/auth/me", headers=auth_header(recycler_token)).json()["id"]
    lot_res = client.post(
        "/api/lots",
        json={"category": "Cable", "declared_weight": 20.0, "recycler_id": r1_id},
        headers=auth_header(dealer_token)
    )
    lot_id = lot_res.json()["lot_id"]

    verify_res = client.post(
        f"/api/handover/verify/{lot_id}",
        json={"verified_weight": 19.5},
        headers=auth_header(recycler_token)
    )
    assert verify_res.status_code == 200
    data = verify_res.json()
    assert data["declared_weight"] == 20.0
    assert data["verified_weight"] == 19.5
    assert data["discrepancy_percentage"] == 2.5
    assert data["discrepancy_warning"] is False

# -------------------------------------------------------------
# 11. >30% Discrepancy Warning (Does NOT Block Confirmation)
# -------------------------------------------------------------
def test_discrepancy_warning_does_not_block_confirmation(client, dealer_token, recycler_token):
    r1_id = client.get("/api/auth/me", headers=auth_header(recycler_token)).json()["id"]
    lot_res = client.post(
        "/api/lots",
        json={"category": "Battery", "declared_weight": 10.0, "recycler_id": r1_id},
        headers=auth_header(dealer_token)
    )
    lot_id = lot_res.json()["lot_id"]

    # 10.0 declared, 6.0 verified -> 40.0% discrepancy (>30%)
    verify_res = client.post(
        f"/api/handover/verify/{lot_id}",
        json={"verified_weight": 6.0},
        headers=auth_header(recycler_token)
    )
    assert verify_res.status_code == 200
    data = verify_res.json()
    assert data["discrepancy_percentage"] == 40.0
    assert data["discrepancy_warning"] is True
    assert data["warning_message"] is not None

    # CRITICAL: Confirming remains permitted despite the warning!
    confirm_res = client.post(
        f"/api/handover/confirm/{lot_id}",
        json={"verified_weight": 6.0, "notes": "Discrepancy reviewed and accepted by inspector"},
        headers=auth_header(recycler_token)
    )
    assert confirm_res.status_code == 200
    assert confirm_res.json()["status"] == "COMPLETED"

# -------------------------------------------------------------
# 12 & 15. Handover Confirmation & Dual Weight Audit
# -------------------------------------------------------------
def test_handover_confirmation_and_dual_weight_preservation(client, dealer_token, recycler_token):
    r1_id = client.get("/api/auth/me", headers=auth_header(recycler_token)).json()["id"]
    lot_res = client.post(
        "/api/lots",
        json={"category": "Cable", "declared_weight": 20.0, "recycler_id": r1_id},
        headers=auth_header(dealer_token)
    )
    lot_id = lot_res.json()["lot_id"]

    confirm_res = client.post(
        f"/api/handover/confirm/{lot_id}",
        json={"verified_weight": 18.0},
        headers=auth_header(recycler_token)
    )
    assert confirm_res.status_code == 200
    tx = confirm_res.json()
    assert tx["lot_id"] == lot_id
    assert tx["declared_weight"] == 20.0
    assert tx["verified_weight"] == 18.0
    assert tx["discrepancy_percentage"] == 10.0
    assert tx["total_payout"] > 0
    assert tx["status"] == "COMPLETED"

    # Verify Lot status is COMPLETED
    lot_check = client.get(f"/api/lots/{lot_id}", headers=auth_header(dealer_token))
    assert lot_check.json()["status"] == "COMPLETED"

# -------------------------------------------------------------
# 13 & 14. Duplicate Confirmation Rejection
# -------------------------------------------------------------
def test_duplicate_confirmation_rejection(client, dealer_token, recycler_token):
    r1_id = client.get("/api/auth/me", headers=auth_header(recycler_token)).json()["id"]
    lot_res = client.post(
        "/api/lots",
        json={"category": "Battery", "declared_weight": 10.0, "recycler_id": r1_id},
        headers=auth_header(dealer_token)
    )
    lot_id = lot_res.json()["lot_id"]

    # First confirmation -> SUCCESS
    res1 = client.post(
        f"/api/handover/confirm/{lot_id}",
        json={"verified_weight": 9.8},
        headers=auth_header(recycler_token)
    )
    assert res1.status_code == 200

    # Second confirmation -> REJECTED (409 Conflict)
    res2 = client.post(
        f"/api/handover/confirm/{lot_id}",
        json={"verified_weight": 9.8},
        headers=auth_header(recycler_token)
    )
    assert res2.status_code == 409
    assert "already been confirmed" in res2.json()["detail"]

# -------------------------------------------------------------
# 16. Role-Based Authorization
# -------------------------------------------------------------
def test_role_based_authorization(client, dealer_token, recycler_token):
    # Dealer CANNOT confirm handovers
    res1 = client.post(
        "/api/handover/confirm/any-lot-id",
        json={"verified_weight": 10.0},
        headers=auth_header(dealer_token)
    )
    assert res1.status_code == 403

    # Recycler CANNOT record dealer purchases
    res2 = client.post(
        "/api/purchases",
        json={"category": "PCB", "weight": 5.0, "price": 1000.0},
        headers=auth_header(recycler_token)
    )
    assert res2.status_code == 403

# -------------------------------------------------------------
# 17. Sync Retry Does Not Create Duplicates
# -------------------------------------------------------------
def test_sync_retry_idempotency(client, dealer_token):
    p1_id = str(uuid.uuid4())
    p2_id = str(uuid.uuid4())
    batch = {
        "purchases": [
            {"purchase_id": p1_id, "category": "CRT", "weight": 15.0, "price": 600.0},
            {"purchase_id": p2_id, "category": "LCD", "weight": 12.0, "price": 1500.0}
        ]
    }

    # First sync
    res1 = client.post("/api/purchases/sync", json=batch, headers=auth_header(dealer_token))
    assert res1.status_code == 200
    assert res1.json()["synced_count"] == 2
    assert res1.json()["existing_count"] == 0

    # Retry sync with same batch
    res2 = client.post("/api/purchases/sync", json=batch, headers=auth_header(dealer_token))
    assert res2.status_code == 200
    assert res2.json()["synced_count"] == 0
    assert res2.json()["existing_count"] == 2

# -------------------------------------------------------------
# Extra: QR Lookup By Lot UUID (Read-only)
# -------------------------------------------------------------
def test_qr_lookup_is_read_only(client, dealer_token, recycler_token):
    r1_id = client.get("/api/auth/me", headers=auth_header(recycler_token)).json()["id"]
    lot_res = client.post(
        "/api/lots",
        json={"category": "PCB", "declared_weight": 10.0, "recycler_id": r1_id},
        headers=auth_header(dealer_token)
    )
    lot_id = lot_res.json()["lot_id"]

    # Recycler scans QR (payload is lot_id)
    qr_res = client.get(f"/api/qr/lookup/{lot_id}", headers=auth_header(recycler_token))
    assert qr_res.status_code == 200
    data = qr_res.json()
    assert data["lot_id"] == lot_id
    assert data["category"] == "PCB"
    assert data["declared_weight"] == 10.0
    # Crucial: lot status must STILL be PENDING_HANDOVER, NOT confirmed!
    assert data["status"] == "PENDING_HANDOVER"

# -------------------------------------------------------------
# Extra: Dealer Ledger Separates Completed vs Pending
# -------------------------------------------------------------
def test_dealer_ledger_accounting(client, dealer_token, recycler_token):
    r1_id = client.get("/api/auth/me", headers=auth_header(recycler_token)).json()["id"]
    lot_res = client.post(
        "/api/lots",
        json={"category": "PCB", "declared_weight": 15.0, "recycler_id": r1_id},
        headers=auth_header(dealer_token)
    )
    lot_id = lot_res.json()["lot_id"]

    # Before confirmation, check ledger
    ledger_before = client.get("/api/dealers/ledger", headers=auth_header(dealer_token)).json()
    assert ledger_before["total_pending_lot_weight"] >= 15.0

    # Confirm handover
    client.post(
        f"/api/handover/confirm/{lot_id}",
        json={"verified_weight": 14.5},
        headers=auth_header(recycler_token)
    )

    # After confirmation, completed sales must reflect in ledger
    ledger_after = client.get("/api/dealers/ledger", headers=auth_header(dealer_token)).json()
    assert ledger_after["total_confirmed_sales"] > 0
    assert ledger_after["confirmed_transactions_count"] >= 1

# -------------------------------------------------------------
# Extra: PDF Traceability Record Download
# -------------------------------------------------------------
def test_pdf_verified_record_download(client, dealer_token, recycler_token):
    r1_id = client.get("/api/auth/me", headers=auth_header(recycler_token)).json()["id"]
    lot_res = client.post(
        "/api/lots",
        json={"category": "PCB", "declared_weight": 10.0, "recycler_id": r1_id},
        headers=auth_header(dealer_token)
    )
    lot_id = lot_res.json()["lot_id"]

    confirm_res = client.post(
        f"/api/handover/confirm/{lot_id}",
        json={"verified_weight": 9.5},
        headers=auth_header(recycler_token)
    )
    tx_id = confirm_res.json()["transaction_id"]

    # Download PDF
    pdf_res = client.get(f"/api/transactions/{tx_id}/pdf", headers=auth_header(dealer_token))
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 100
    assert pdf_res.content.startswith(b"%PDF")

# -------------------------------------------------------------
# 19. Partial Purchase Splitting & Mass-Balance
# -------------------------------------------------------------
def test_partial_purchase_splitting_mass_balance(client, dealer_token):
    # Log a single bulk purchase of 50kg CRT
    purchase_res = client.post(
        "/api/purchases",
        json={"category": "CRT", "weight": 50.0, "price": 10000.0, "unit_price": 200.0},
        headers=auth_header(dealer_token)
    )
    assert purchase_res.status_code == 201

    # Dealer creates a lot for only 15kg CRT
    lot_res = client.post(
        "/api/lots",
        json={"category": "CRT", "declared_weight": 15.0},
        headers=auth_header(dealer_token)
    )
    assert lot_res.status_code == 201
    assert lot_res.json()["declared_weight"] == 15.0

    # Authoritative stock MUST show the remaining 35kg CRT still available!
    stock_res = client.get("/api/stock", headers=auth_header(dealer_token))
    assert stock_res.status_code == 200
    stock_data = stock_res.json()
    assert "items" in stock_data
    crt_summary = next(c for c in stock_data["categories"] if c["category"] == "CRT")
    assert crt_summary["available_weight"] == 35.0
    assert crt_summary["pooled_weight"] >= 15.0

    # Dealer can now successfully pool the remaining 35kg CRT!
    lot2_res = client.post(
        "/api/lots",
        json={"category": "CRT", "declared_weight": 35.0},
        headers=auth_header(dealer_token)
    )
    assert lot2_res.status_code == 201
    assert lot2_res.json()["declared_weight"] == 35.0

# -------------------------------------------------------------
# 20. Lot Cancellation Restores Stock to Inventory
# -------------------------------------------------------------
def test_lot_cancellation_restores_stock(client, dealer_token):
    # Log 20kg LCD purchase
    client.post(
        "/api/purchases",
        json={"category": "LCD", "weight": 20.0, "price": 6000.0, "unit_price": 300.0},
        headers=auth_header(dealer_token)
    )

    # Pool into a lot
    lot_res = client.post(
        "/api/lots",
        json={"category": "LCD", "declared_weight": 20.0},
        headers=auth_header(dealer_token)
    )
    assert lot_res.status_code == 201
    lot_id = lot_res.json()["lot_id"]

    # Available stock is now 0kg for LCD
    stock_before = client.get("/api/stock", headers=auth_header(dealer_token)).json()
    lcd_stock = next(c for c in stock_before["categories"] if c["category"] == "LCD")
    assert lcd_stock["available_weight"] == 0.0

    # Cancel the lot
    cancel_res = client.post(f"/api/lots/{lot_id}/cancel", headers=auth_header(dealer_token))
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"

    # Available stock MUST be restored to 20kg!
    stock_after = client.get("/api/stock", headers=auth_header(dealer_token)).json()
    lcd_stock_after = next(c for c in stock_after["categories"] if c["category"] == "LCD")
    assert lcd_stock_after["available_weight"] == 20.0

# -------------------------------------------------------------
# 21. Recycler Assignment Protocol (Both POST and PATCH) & Route Alias
# -------------------------------------------------------------
def test_recycler_assignment_methods_and_route_alias(client, dealer_token, recycler_token):
    r1_id = client.get("/api/auth/me", headers=auth_header(recycler_token)).json()["id"]

    # Test GET /lots/dealer/my-lots route alias
    my_lots_res = client.get("/api/lots/dealer/my-lots", headers=auth_header(dealer_token))
    assert my_lots_res.status_code == 200
    assert isinstance(my_lots_res.json(), list)

    # Log stock & create lot
    client.post(
        "/api/purchases",
        json={"category": "Cable", "weight": 10.0, "price": 2000.0, "unit_price": 200.0},
        headers=auth_header(dealer_token)
    )
    lot_res = client.post(
        "/api/lots",
        json={"category": "Cable", "declared_weight": 10.0},
        headers=auth_header(dealer_token)
    )
    lot_id = lot_res.json()["lot_id"]

    # Assign recycler using HTTP POST (previously failed with 405)
    post_assign = client.post(
        f"/api/lots/{lot_id}/assign-recycler",
        json={"recycler_id": r1_id},
        headers=auth_header(dealer_token)
    )
    assert post_assign.status_code == 200
    assert post_assign.json()["recycler_id"] == r1_id
    assert post_assign.json()["status"] == "PENDING_HANDOVER"

    # Assign recycler using HTTP PATCH (standard REST)
    patch_assign = client.patch(
        f"/api/lots/{lot_id}/assign-recycler",
        json={"recycler_id": r1_id},
        headers=auth_header(dealer_token)
    )
    assert patch_assign.status_code == 200
    assert patch_assign.json()["recycler_id"] == r1_id

# -------------------------------------------------------------
# 22. Dealer Weight Discrepancy Dispute & Recourse
# -------------------------------------------------------------
def test_dealer_weight_discrepancy_dispute_and_acceptance(client, dealer_token, recycler_token):
    r1_id = client.get("/api/auth/me", headers=auth_header(recycler_token)).json()["id"]

    client.post(
        "/api/purchases",
        json={"category": "Cable", "weight": 20.0, "price": 5000.0, "unit_price": 250.0},
        headers=auth_header(dealer_token)
    )
    lot = client.post(
        "/api/lots",
        json={"category": "Cable", "declared_weight": 20.0, "recycler_id": r1_id},
        headers=auth_header(dealer_token)
    ).json()

    # Recycler confirms with severe 50% discrepancy (20kg declared -> 10kg verified)
    confirm_res = client.post(
        f"/api/handover/confirm/{lot['lot_id']}",
        json={"verified_weight": 10.0},
        headers=auth_header(recycler_token)
    )
    assert confirm_res.status_code == 200
    tx_id = confirm_res.json()["transaction_id"]

    # Dealer disputes the transaction
    dispute_res = client.post(
        f"/api/transactions/{tx_id}/dispute",
        json={"reason": "Weigh scale at recycler premise was faulty; batch verified at dispatch was 20kg."},
        headers=auth_header(dealer_token)
    )
    assert dispute_res.status_code == 200
    assert dispute_res.json()["disputed"] is True
    assert "faulty" in dispute_res.json()["dispute_reason"]
    assert dispute_res.json()["status"] == "DISPUTED"

    # Dealer later accepts after renegotiation/resolution
    accept_res = client.post(
        f"/api/transactions/{tx_id}/accept",
        headers=auth_header(dealer_token)
    )
    assert accept_res.status_code == 200
    assert accept_res.json()["disputed"] is False
    assert accept_res.json()["status"] == "COMPLETED"
