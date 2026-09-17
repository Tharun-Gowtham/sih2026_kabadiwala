"""
Seed Demo Lots & Transactions for Kabadiwala Connect
Populates realistic demonstration data into the active SQLite database (kabadiwala.db):
1. PENDING_HANDOVER Lot (PCB 25kg, assigned to GreenCycle - ready for QR scan)
2. COMPLETED Lot + Transaction (PCB 40kg, verified 39.2kg, payout Rs 20,384, EPR certificate ready)
3. DISPUTED Lot + Transaction (Cable 20kg, verified 14.5kg, discrepancy 27.5%, flagged for audit)
"""

import uuid
from datetime import datetime, timezone, timedelta
from app.core.database import Base, engine, SessionLocal
from app.services.seeder import seed_demo_data
from app.models.user import User
from app.models.purchase import Purchase
from app.models.lot import Lot
from app.models.transaction import Transaction
from app.core.config import LotStatus, SyncStatus, MaterialCategory

def seed_demo_lots():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        dealer = db.query(User).filter(User.email == "dealer@kabadiwala.com").first()
        if not dealer:
            seed_demo_data(db)
            dealer = db.query(User).filter(User.email == "dealer@kabadiwala.com").first()

        r1 = db.query(User).filter(User.email == "greencycle@recycler.com").first()
        r2 = db.query(User).filter(User.email == "ecorecover@recycler.com").first()

        if not dealer or not r1 or not r2:
            print("Required users not found even after seeding.")
            return

        # Check if lots already exist
        existing_lots = db.query(Lot).count()
        if existing_lots > 0:
            print(f"Database already has {existing_lots} lots. Skipping lot seeding.")
            return

        now = datetime.now(timezone.utc)

        # 1. Purchases for the demo lots
        p1 = Purchase(
            purchase_id=str(uuid.uuid4()),
            dealer_id=dealer.id,
            category=MaterialCategory.PCB.value,
            weight=25.0,
            price=11250.0,
            unit_price=450.0,
            sync_status=SyncStatus.SYNCED.value,
            collector_reference="Collector Raju (Mayapuri)",
            created_at=now - timedelta(hours=6)
        )
        p2 = Purchase(
            purchase_id=str(uuid.uuid4()),
            dealer_id=dealer.id,
            category=MaterialCategory.PCB.value,
            weight=40.0,
            price=18400.0,
            unit_price=460.0,
            sync_status=SyncStatus.SYNCED.value,
            collector_reference="Collector Sunita (Shadipur)",
            created_at=now - timedelta(days=2)
        )
        p3 = Purchase(
            purchase_id=str(uuid.uuid4()),
            dealer_id=dealer.id,
            category=MaterialCategory.CABLE.value,
            weight=20.0,
            price=6000.0,
            unit_price=300.0,
            sync_status=SyncStatus.SYNCED.value,
            collector_reference="Collector Mohan (Kirti Nagar)",
            created_at=now - timedelta(days=1)
        )
        db.add_all([p1, p2, p3])
        db.flush()

        # 2. Lot 1: PENDING HANDOVER to GreenCycle (Ready for QR Scan in Recycler Dashboard)
        lot1_id = "LOT-2026-DEL-001"
        lot1 = Lot(
            lot_id=lot1_id,
            dealer_id=dealer.id,
            recycler_id=r1.id,
            category=MaterialCategory.PCB.value,
            declared_weight=25.0,
            status=LotStatus.PENDING_HANDOVER.value,
            created_at=now - timedelta(hours=4),
            updated_at=now - timedelta(hours=2)
        )
        p1.lot_id = lot1_id
        db.add(lot1)

        # 3. Lot 2: COMPLETED (Verified by GreenCycle with Transaction and EPR Certificate)
        lot2_id = "LOT-2026-DEL-002"
        lot2 = Lot(
            lot_id=lot2_id,
            dealer_id=dealer.id,
            recycler_id=r1.id,
            category=MaterialCategory.PCB.value,
            declared_weight=40.0,
            status=LotStatus.COMPLETED.value,
            created_at=now - timedelta(days=2),
            updated_at=now - timedelta(days=2)
        )
        p2.lot_id = lot2_id
        db.add(lot2)
        db.flush()

        txn2 = Transaction(
            transaction_id="TXN-2026-0091",
            lot_id=lot2_id,
            dealer_id=dealer.id,
            recycler_id=r1.id,
            category=MaterialCategory.PCB.value,
            declared_weight=40.0,
            verified_weight=39.2,
            discrepancy_percentage=-2.0,
            rate_per_kg=520.0,
            total_payout=20384.0,
            status=LotStatus.COMPLETED.value,
            disputed=False,
            timestamp=now - timedelta(days=2),
            notes="Verified on certified digital weighbridge. High grade motherboard scrap."
        )
        db.add(txn2)

        # 4. Lot 3: DISPUTED (Cable with moisture/filler discrepancy)
        lot3_id = "LOT-2026-DEL-003"
        lot3 = Lot(
            lot_id=lot3_id,
            dealer_id=dealer.id,
            recycler_id=r2.id,
            category=MaterialCategory.CABLE.value,
            declared_weight=20.0,
            status=LotStatus.DISPUTED.value,
            created_at=now - timedelta(days=1),
            updated_at=now - timedelta(days=1)
        )
        p3.lot_id = lot3_id
        db.add(lot3)
        db.flush()

        txn3 = Transaction(
            transaction_id="TXN-2026-0092",
            lot_id=lot3_id,
            dealer_id=dealer.id,
            recycler_id=r2.id,
            category=MaterialCategory.CABLE.value,
            declared_weight=20.0,
            verified_weight=14.5,
            discrepancy_percentage=-27.5,
            rate_per_kg=380.0,
            total_payout=5510.0,
            status=LotStatus.DISPUTED.value,
            disputed=True,
            dispute_reason="Severe weight discrepancy (>5%). Water/lead filler contamination detected in PVC sheath.",
            timestamp=now - timedelta(days=1),
            notes="Flagged for manual inspection under CPCB Rule 13."
        )
        db.add(txn3)

        db.commit()
        print("Successfully seeded 3 demo lots and 2 transactions!")
        print(f"  - Lot 1 (Pending Handover to GreenCycle): {lot1_id} (PCB 25kg)")
        print(f"  - Lot 2 (Completed with EPR Cert): {lot2_id} (PCB 40kg -> 39.2kg, Rs 20,384)")
        print(f"  - Lot 3 (Disputed Audit Flag): {lot3_id} (Cable 20kg -> 14.5kg)")

    except Exception as e:
        db.rollback()
        print(f"Error seeding demo lots: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_demo_lots()
