import os
import sys
import logging
from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings, TrustTier
from app.services.seeder import seed_demo_data
from app.models.user import User
from app.models.fraud_alert import FraudAlert
from app.models.audit_log import AuditLog

# Suppress noisy logging
logging.getLogger("passlib").setLevel(logging.ERROR)

print("🚀 Starting Fraud Detection Engine Simulation...")
print("-" * 60)

# Setup Test DB
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)
db = TestingSessionLocal()
seed_demo_data(db)

def override_get_db():
    try:
        yield db
    finally:
        pass

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

# 1. Login as Dealer
print("1. Logging in as Dealer...")
res = client.post("/api/auth/login", json={"email": "dealer@kabadiwala.com", "password": "password123"})
dealer_token = res.json()["access_token"]
headers = {"Authorization": f"Bearer {dealer_token}"}

dealer = db.query(User).filter(User.email == "dealer@kabadiwala.com").first()
print(f"✅ Dealer logged in. Initial Trust Score: {dealer.trust_score}, Tier: {dealer.trust_tier}")
print("-" * 60)

# 2. Test Velocity Controls (Max 20 per hour)
print(f"2. Testing Velocity Controls (Limit: {settings.MAX_PURCHASES_PER_HOUR} purchases/hour)...")
print("   Attempting to rapid-fire 22 purchases...")

success_count = 0
for i in range(22):
    payload = {
        "category": "PCB",
        "weight": 2.0,  # Below photo requirement (5kg)
        "price": 500.0
    }
    # We bypass the MIN_PURCHASE_INTERVAL_SECONDS check by manually advancing timestamps in a real scenario,
    # but since MIN_PURCHASE_INTERVAL_SECONDS is 60s by default, the very second purchase will fail immediately.
    # Let's temporarily disable the interval check for this specific script to test the hourly cap.
    settings.MIN_PURCHASE_INTERVAL_SECONDS = 0
    
    res = client.post("/api/purchases", json=payload, headers=headers)
    if res.status_code == 201:
        success_count += 1
    else:
        print(f"   ❌ Purchase {i+1} Blocked! Status: {res.status_code}, Detail: {res.json()['detail']}")
        break

print(f"✅ Successfully created {success_count} purchases before being blocked.")
print("-" * 60)

# 3. Test Photo Verification Requirement
print(f"3. Testing Photo Evidence Requirement (Limit: {settings.PHOTO_REQUIRED_WEIGHT_KG} kg)...")
payload_heavy = {
    "category": "PCB",
    "weight": 50.0,
    "price": 5000.0
}
res = client.post("/api/purchases", json=payload_heavy, headers=headers)
print(f"   Attempting 50kg purchase without photo -> Status: {res.status_code}")
if res.status_code == 400:
    print(f"   ✅ Blocked as expected: {res.json()['detail']}")
print("-" * 60)

# 4. Check Dealer Trust Score
print("4. Re-evaluating Dealer Trust Score...")
from app.services.fraud_detection import compute_trust_score
trust_data = compute_trust_score(db, dealer.id)

print(f"   Current Score: {trust_data['trust_score']}")
print(f"   Current Tier: {trust_data['trust_tier']}")
if trust_data.get('penalties'):
    print("   Penalties Breakdown:")
    for k, v in trust_data['penalties'].items():
        if v > 0:
            print(f"     - {k}: -{v} pts")
print("-" * 60)

# 5. Check Fraud Alerts
print("5. Checking Generated Fraud Alerts...")
alerts = db.query(FraudAlert).all()
for a in alerts:
    print(f"   🚨 [{a.severity}] {a.alert_type} - {a.details_json}")
print("-" * 60)

# 6. Check Immutable Audit Log
print("6. Verifying Immutable Audit Chain Integrity...")
from app.services.audit_service import verify_chain
chain_status = verify_chain(db)
print(f"   Chain Valid: {chain_status['valid']} (Total Entries: {chain_status['total_entries']})")
if chain_status['valid']:
    print("   ✅ Audit chain is perfectly intact.")
    logs = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(3).all()
    print("   Recent Audit Logs:")
    for log in logs:
        print(f"     -> {log.action} on {log.entity_type}:{log.entity_id[:8]}... (Hash: {log.entry_hash[:12]}...)")
print("-" * 60)

print("🎉 Fraud Detection Engine Simulation Complete!")
