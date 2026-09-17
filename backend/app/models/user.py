import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # DEALER, RECYCLER, ADMIN
    name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    address = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # ── Fraud Detection: Trust Scoring ──
    trust_score = Column(Float, default=100.0, nullable=False)
    trust_tier = Column(String(20), default="TRUSTED", nullable=False)
    last_trust_computed_at = Column(DateTime, nullable=True)
    suspended_reason = Column(String(500), nullable=True)

    # Relationships
    purchases = relationship("Purchase", back_populates="dealer", cascade="all, delete-orphan")
    dealer_lots = relationship("Lot", foreign_keys="Lot.dealer_id", back_populates="dealer")
    recycler_lots = relationship("Lot", foreign_keys="Lot.recycler_id", back_populates="recycler")
    recycler_profile = relationship("RecyclerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    dealer_transactions = relationship("Transaction", foreign_keys="Transaction.dealer_id", back_populates="dealer")
    recycler_transactions = relationship("Transaction", foreign_keys="Transaction.recycler_id", back_populates="recycler")
