import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.core.config import LotStatus

class Transaction(Base):
    __tablename__ = "transactions"

    transaction_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    # Strict 1-to-1 uniqueness constraint: a lot can only be confirmed once!
    lot_id = Column(String(36), ForeignKey("lots.lot_id", ondelete="RESTRICT"), unique=True, nullable=False, index=True)
    dealer_id = Column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    recycler_id = Column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    category = Column(String(50), nullable=False)
    declared_weight = Column(Float, nullable=False)
    verified_weight = Column(Float, nullable=False)
    discrepancy_percentage = Column(Float, nullable=False)
    rate_per_kg = Column(Float, nullable=False)
    total_payout = Column(Float, nullable=False)
    status = Column(String(50), default=LotStatus.COMPLETED.value, nullable=False)
    disputed = Column(Boolean, default=False, nullable=False)
    dispute_reason = Column(String(500), nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    notes = Column(String(500), nullable=True)

    # Relationships
    lot = relationship("Lot", back_populates="transaction")
    dealer = relationship("User", foreign_keys=[dealer_id], back_populates="dealer_transactions")
    recycler = relationship("User", foreign_keys=[recycler_id], back_populates="recycler_transactions")
