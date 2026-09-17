"""
AuditLog — Hash-Chained Immutable Audit Trail
==============================================

Every significant action in the platform is recorded here with
cryptographic chaining. Each row's hash includes the previous row's
hash, creating a tamper-evident chain (lightweight blockchain).

If any row is modified or deleted, the chain breaks and an integrity
check will detect the tampering.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime, JSON, Index
from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    actor_id = Column(String(36), nullable=False, index=True)
    actor_role = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False)     # Purchase, Lot, Transaction, etc.
    entity_id = Column(String(36), nullable=False, index=True)
    details_json = Column(JSON, nullable=True)            # Snapshot of key fields at time of action
    ip_address = Column(String(45), nullable=True)        # Client IP for forensics
    prev_hash = Column(String(64), nullable=False)        # SHA-256 of previous log entry
    entry_hash = Column(String(64), nullable=False)       # SHA-256 of this entry (including prev_hash)

    __table_args__ = (
        Index("ix_audit_entity", "entity_type", "entity_id"),
        Index("ix_audit_action_time", "action", "timestamp"),
    )
