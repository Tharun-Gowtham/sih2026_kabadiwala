"""
Audit Service — Hash-Chained Tamper-Evident Logging
====================================================

Provides:
  1. log_action()        — Append a new hash-chained audit entry
  2. verify_chain()      — Validate the entire audit chain integrity
  3. get_entity_history() — Retrieve all audit entries for a specific entity

Each entry's hash is computed from: timestamp + actor + action + entity +
details + prev_hash.  If any row is altered or deleted, the chain breaks.
"""

import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, List

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog

logger = logging.getLogger(__name__)


def _compute_hash(
    timestamp: str,
    actor_id: str,
    action: str,
    entity_type: str,
    entity_id: str,
    details_json: Optional[str],
    prev_hash: str,
) -> str:
    """Compute SHA-256 hash for an audit entry."""
    payload = f"{timestamp}|{actor_id}|{action}|{entity_type}|{entity_id}|{details_json or ''}|{prev_hash}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


# Genesis hash — used as prev_hash for the very first entry
GENESIS_HASH = "0" * 64


def log_action(
    db: Session,
    actor_id: str,
    actor_role: str,
    action: str,
    entity_type: str,
    entity_id: str,
    details: Optional[Dict] = None,
    ip_address: Optional[str] = None,
) -> AuditLog:
    """
    Append a new hash-chained audit entry.

    Actions should follow the convention: ENTITY_VERB
    e.g. PURCHASE_CREATED, LOT_CREATED, HANDOVER_CONFIRMED,
         LOT_CANCELLED, TRUST_SCORE_UPDATED, ALERT_CREATED
    """
    now = datetime.now(timezone.utc)

    # Get the hash of the most recent entry (or genesis hash)
    last_entry = (
        db.query(AuditLog)
        .order_by(AuditLog.id.desc())
        .first()
    )
    prev_hash = last_entry.entry_hash if last_entry else GENESIS_HASH

    # Serialize details
    details_str = json.dumps(details, sort_keys=True, default=str) if details else None

    # Compute this entry's hash
    entry_hash = _compute_hash(
        timestamp=now.isoformat(),
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details_json=details_str,
        prev_hash=prev_hash,
    )

    entry = AuditLog(
        timestamp=now,
        actor_id=actor_id,
        actor_role=actor_role,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details_json=details if details else None,
        ip_address=ip_address,
        prev_hash=prev_hash,
        entry_hash=entry_hash,
    )
    db.add(entry)
    # We flush but don't commit — let the caller's transaction boundary manage this
    db.flush()

    logger.info(
        f"AUDIT: {action} on {entity_type}:{entity_id} by {actor_id} "
        f"[hash={entry_hash[:12]}...]"
    )
    return entry


def verify_chain(db: Session) -> Dict:
    """
    Validate the entire audit chain for tampering.

    Returns:
        {
            "valid": bool,
            "total_entries": int,
            "first_broken_id": int | None,
            "error": str | None
        }
    """
    entries = db.query(AuditLog).order_by(AuditLog.id.asc()).all()

    if not entries:
        return {"valid": True, "total_entries": 0, "first_broken_id": None, "error": None}

    expected_prev = GENESIS_HASH

    for entry in entries:
        # Check that prev_hash matches what we expect
        if entry.prev_hash != expected_prev:
            return {
                "valid": False,
                "total_entries": len(entries),
                "first_broken_id": entry.id,
                "error": f"Entry {entry.id} prev_hash mismatch: expected {expected_prev[:16]}..., got {entry.prev_hash[:16]}...",
            }

        # Recompute entry hash to verify content wasn't altered
        details_str = json.dumps(entry.details_json, sort_keys=True, default=str) if entry.details_json else None
        recomputed = _compute_hash(
            timestamp=entry.timestamp.isoformat(),
            actor_id=entry.actor_id,
            action=entry.action,
            entity_type=entry.entity_type,
            entity_id=entry.entity_id,
            details_json=details_str,
            prev_hash=entry.prev_hash,
        )

        if recomputed != entry.entry_hash:
            return {
                "valid": False,
                "total_entries": len(entries),
                "first_broken_id": entry.id,
                "error": f"Entry {entry.id} content hash mismatch: computed {recomputed[:16]}..., stored {entry.entry_hash[:16]}...",
            }

        expected_prev = entry.entry_hash

    return {"valid": True, "total_entries": len(entries), "first_broken_id": None, "error": None}


def get_entity_history(
    db: Session,
    entity_type: str,
    entity_id: str,
) -> List[AuditLog]:
    """Retrieve all audit entries for a specific entity, oldest first."""
    return (
        db.query(AuditLog)
        .filter(AuditLog.entity_type == entity_type, AuditLog.entity_id == entity_id)
        .order_by(AuditLog.timestamp.asc())
        .all()
    )
