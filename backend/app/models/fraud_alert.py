"""
FraudAlert — Fraud Detection Alert Records
===========================================

Stores automatically generated alerts when the anomaly detection
engine flags suspicious behavior patterns. Alerts are reviewed and
resolved by admins.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class FraudAlert(Base):
    __tablename__ = "fraud_alerts"

    alert_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    dealer_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    alert_type = Column(String(50), nullable=False, index=True)
    # Types: VELOCITY_SPIKE, WEIGHT_ANOMALY, GPS_DRIFT, HIGH_DISCREPANCY,
    #        COLLUSION_PATTERN, CANCELLATION_ABUSE, PHOTO_MISSING
    severity = Column(String(20), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    details_json = Column(JSON, nullable=True)
    resolved = Column(Boolean, default=False, nullable=False)
    resolved_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolution_notes = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    dealer = relationship("User", foreign_keys=[dealer_id])
    resolver = relationship("User", foreign_keys=[resolved_by])
