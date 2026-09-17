import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.recycler import RecyclerProfile
from app.models.purchase import Purchase
from app.core.security import get_password_hash
from app.core.config import UserRole, MaterialCategory, SyncStatus

def seed_demo_data(db: Session):
    # Check if data already exists
    existing_user = db.query(User).filter(User.email == "dealer@kabadiwala.com").first()
    if existing_user:
        return

    # 1. Create Default Dealer
    dealer = User(
        id=str(uuid.uuid4()),
        email="dealer@kabadiwala.com",
        password_hash=get_password_hash("password123"),
        role=UserRole.DEALER.value,
        name="Ramesh Scrap Traders",
        phone="+91-9876543210",
        address="Mayapuri Industrial Area, New Delhi",
        latitude=28.6280,
        longitude=77.1230,
        created_at=datetime.now(timezone.utc)
    )
    db.add(dealer)
    db.flush()

    # 2. Create Recycler 1: GreenCycle E-Waste
    r1_user = User(
        id=str(uuid.uuid4()),
        email="greencycle@recycler.com",
        password_hash=get_password_hash("password123"),
        role=UserRole.RECYCLER.value,
        name="GreenCycle Recycling Corp",
        phone="+91-9811122233",
        address="Okhla Phase 1, New Delhi",
        latitude=28.5355,
        longitude=77.2732,
        created_at=datetime.now(timezone.utc)
    )
    db.add(r1_user)
    db.flush()

    r1_profile = RecyclerProfile(
        user_id=r1_user.id,
        company_name="GreenCycle Recycling Corp",
        accepted_categories=[
            MaterialCategory.PCB.value,
            MaterialCategory.BATTERY.value,
            MaterialCategory.CABLE.value
        ],
        rates={
            MaterialCategory.PCB.value: 520.0,
            MaterialCategory.BATTERY.value: 110.0,
            MaterialCategory.CABLE.value: 380.0
        },
        pickup_available=True,
        service_radius_km=40.0,
        latitude=28.5355,
        longitude=77.2732
    )
    db.add(r1_profile)

    # 3. Create Recycler 2: EcoRecover Technologies
    r2_user = User(
        id=str(uuid.uuid4()),
        email="ecorecover@recycler.com",
        password_hash=get_password_hash("password123"),
        role=UserRole.RECYCLER.value,
        name="EcoRecover Technologies",
        phone="+91-9822233344",
        address="Sector 58, Noida",
        latitude=28.6019,
        longitude=77.3621,
        created_at=datetime.now(timezone.utc)
    )
    db.add(r2_user)
    db.flush()

    r2_profile = RecyclerProfile(
        user_id=r2_user.id,
        company_name="EcoRecover Technologies",
        accepted_categories=[
            MaterialCategory.PCB.value,
            MaterialCategory.CRT.value,
            MaterialCategory.LCD.value,
            MaterialCategory.MOTOR_MAGNET.value,
            MaterialCategory.MIXED_PLASTIC.value
        ],
        rates={
            MaterialCategory.PCB.value: 490.0,
            MaterialCategory.CRT.value: 45.0,
            MaterialCategory.LCD.value: 180.0,
            MaterialCategory.MOTOR_MAGNET.value: 95.0,
            MaterialCategory.MIXED_PLASTIC.value: 35.0
        },
        pickup_available=True,
        service_radius_km=60.0,
        latitude=28.6019,
        longitude=77.3621
    )
    db.add(r2_profile)

    # 4. Create Recycler 3: CleanEarth Recycling
    r3_user = User(
        id=str(uuid.uuid4()),
        email="cleanearth@recycler.com",
        password_hash=get_password_hash("password123"),
        role=UserRole.RECYCLER.value,
        name="CleanEarth Recycling",
        phone="+91-9833344455",
        address="Naraina Industrial Area, New Delhi",
        latitude=28.6250,
        longitude=77.1390,
        created_at=datetime.now(timezone.utc)
    )
    db.add(r3_user)
    db.flush()

    r3_profile = RecyclerProfile(
        user_id=r3_user.id,
        company_name="CleanEarth Recycling",
        accepted_categories=[
            MaterialCategory.PCB.value,
            MaterialCategory.LCD.value,
            MaterialCategory.MIXED_PLASTIC.value
        ],
        rates={
            MaterialCategory.PCB.value: 470.0,
            MaterialCategory.LCD.value: 195.0,
            MaterialCategory.MIXED_PLASTIC.value: 32.0
        },
        pickup_available=False,
        service_radius_km=25.0,
        latitude=28.6250,
        longitude=77.1390
    )
    db.add(r3_profile)

    # 5. Seed Initial Stock Purchases for Dealer
    initial_purchases = [
        Purchase(
            purchase_id=str(uuid.uuid4()),
            dealer_id=dealer.id,
            category=MaterialCategory.PCB.value,
            weight=10.0,
            price=4500.0,
            unit_price=450.0,
            sync_status=SyncStatus.SYNCED.value,
            collector_reference="Collector Raju",
            created_at=datetime.now(timezone.utc)
        ),
        Purchase(
            purchase_id=str(uuid.uuid4()),
            dealer_id=dealer.id,
            category=MaterialCategory.PCB.value,
            weight=20.0,
            price=9000.0,
            unit_price=450.0,
            sync_status=SyncStatus.SYNCED.value,
            collector_reference="Collector Mohan",
            created_at=datetime.now(timezone.utc)
        ),
        Purchase(
            purchase_id=str(uuid.uuid4()),
            dealer_id=dealer.id,
            category=MaterialCategory.CABLE.value,
            weight=25.0,
            price=7500.0,
            unit_price=300.0,
            sync_status=SyncStatus.SYNCED.value,
            collector_reference="Collector Raju",
            created_at=datetime.now(timezone.utc)
        ),
        Purchase(
            purchase_id=str(uuid.uuid4()),
            dealer_id=dealer.id,
            category=MaterialCategory.BATTERY.value,
            weight=15.0,
            price=1200.0,
            unit_price=80.0,
            sync_status=SyncStatus.SYNCED.value,
            created_at=datetime.now(timezone.utc)
        )
    ]

    for p in initial_purchases:
        db.add(p)

    db.commit()
