import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.core.config import LotStatus


class Lot(Base):
    __tablename__ = "lots"

    lot_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    dealer_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    recycler_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    category = Column(String(50), nullable=False, index=True)
    declared_weight = Column(Float, nullable=False)
    status = Column(String(50), default=LotStatus.POOLED.value, nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Geolocation fields (for milk-run routing)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    geohash_cell = Column(String(20), nullable=True, index=True)

    # Batch membership status: "unbatched" | "batched" | "dispatched" | None
    batch_status = Column(String(20), nullable=True)

    # Relationships
    dealer = relationship("User", foreign_keys=[dealer_id], back_populates="dealer_lots")
    recycler = relationship("User", foreign_keys=[recycler_id], back_populates="recycler_lots")
    purchases = relationship("Purchase", back_populates="lot")
    transaction = relationship("Transaction", back_populates="lot", uselist=False)
    batch_lots = relationship("BatchLot", back_populates="lot", cascade="all, delete-orphan")
