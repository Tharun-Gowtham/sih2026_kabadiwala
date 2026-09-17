import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.core.config import SyncStatus

class Purchase(Base):
    __tablename__ = "purchases"

    purchase_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    dealer_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(String(50), nullable=False, index=True)
    weight = Column(Float, nullable=False)
    price = Column(Float, nullable=False)  # Total cost paid by dealer
    unit_price = Column(Float, nullable=True)  # Price per kg
    sync_status = Column(String(50), default=SyncStatus.SYNCED.value, nullable=False)
    lot_id = Column(String(36), ForeignKey("lots.lot_id", ondelete="SET NULL"), nullable=True, index=True)
    collector_reference = Column(String(255), nullable=True)
    photo_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    synced_at = Column(DateTime, nullable=True)

    # ── Fraud Detection: Evidence Chain ──
    photo_hash = Column(String(64), nullable=True)       # SHA-256 of uploaded photo for tamper detection
    gps_latitude = Column(Float, nullable=True)           # GPS at point-of-purchase
    gps_longitude = Column(Float, nullable=True)          # GPS at point-of-purchase
    photo_verified = Column(Boolean, default=False, nullable=False)  # Set by admin/ML review

    # Relationships
    dealer = relationship("User", back_populates="purchases")
    lot = relationship("Lot", back_populates="purchases")

