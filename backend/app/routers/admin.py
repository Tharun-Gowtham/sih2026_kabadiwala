"""
Admin Router — Fraud Alert Review & Trust Management
=====================================================

Endpoints for platform administrators to:
  - View and resolve fraud alerts
  - Inspect and override dealer trust scores
  - Verify audit chain integrity
  - Approve PENDING_REVIEW lots (from probation dealers)

Authentication: Uses ADMIN role or admin secret key.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.config import settings, TrustTier, LotStatus, UserRole
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.lot import Lot
from app.models.fraud_alert import FraudAlert
from app.models.audit_log import AuditLog
from app.services.audit_service import verify_chain, log_action
from app.services.fraud_detection import compute_trust_score, update_dealer_trust

router = APIRouter(prefix="/admin", tags=["Admin — Fraud Management"])


# ── Auth: Admin gate ──────────────────────────────────────────

def get_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Only ADMIN role users can access admin endpoints."""
    if current_user.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required."
        )
    return current_user


# ── Schemas ───────────────────────────────────────────────────

class FraudAlertResponse(BaseModel):
    alert_id: str
    dealer_id: str
    dealer_name: Optional[str] = None
    alert_type: str
    severity: str
    details_json: Optional[dict] = None
    resolved: bool
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    created_at: datetime

class ResolveAlertRequest(BaseModel):
    resolution_notes: str = Field(..., min_length=3)

class TrustScoreResponse(BaseModel):
    dealer_id: str
    dealer_name: str
    trust_score: float
    trust_tier: str
    suspended_reason: Optional[str] = None
    last_computed_at: Optional[datetime] = None
    penalties: Optional[dict] = None

class OverrideTrustRequest(BaseModel):
    trust_tier: str = Field(..., description="New trust tier: TRUSTED, WATCH, PROBATION, or SUSPENDED")
    reason: str = Field(..., min_length=3)

class AuditChainResponse(BaseModel):
    valid: bool
    total_entries: int
    first_broken_id: Optional[int] = None
    error: Optional[str] = None

class LotApprovalResponse(BaseModel):
    lot_id: str
    status: str
    message: str


# ── Fraud Alerts ──────────────────────────────────────────────

@router.get("/alerts", response_model=List[FraudAlertResponse])
def list_fraud_alerts(
    resolved: Optional[bool] = Query(None),
    severity: Optional[str] = Query(None),
    dealer_id: Optional[str] = Query(None),
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """List all fraud alerts, with optional filters."""
    query = db.query(FraudAlert)
    if resolved is not None:
        query = query.filter(FraudAlert.resolved == resolved)
    if severity:
        query = query.filter(FraudAlert.severity == severity.upper())
    if dealer_id:
        query = query.filter(FraudAlert.dealer_id == dealer_id)

    alerts = query.order_by(FraudAlert.created_at.desc()).all()
    return [
        FraudAlertResponse(
            alert_id=a.alert_id,
            dealer_id=a.dealer_id,
            dealer_name=a.dealer.name if a.dealer else None,
            alert_type=a.alert_type,
            severity=a.severity,
            details_json=a.details_json,
            resolved=a.resolved,
            resolved_by=a.resolved_by,
            resolved_at=a.resolved_at,
            resolution_notes=a.resolution_notes,
            created_at=a.created_at,
        )
        for a in alerts
    ]


@router.post("/alerts/{alert_id}/resolve", response_model=FraudAlertResponse)
def resolve_fraud_alert(
    alert_id: str,
    data: ResolveAlertRequest,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Mark a fraud alert as resolved with notes."""
    alert = db.query(FraudAlert).filter(FraudAlert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    alert.resolved = True
    alert.resolved_by = admin.id
    alert.resolved_at = datetime.now(timezone.utc)
    alert.resolution_notes = data.resolution_notes

    log_action(
        db=db,
        actor_id=admin.id,
        actor_role=admin.role,
        action="ALERT_RESOLVED",
        entity_type="FraudAlert",
        entity_id=alert_id,
        details={"resolution_notes": data.resolution_notes, "alert_type": alert.alert_type},
    )

    db.commit()
    db.refresh(alert)
    return FraudAlertResponse(
        alert_id=alert.alert_id,
        dealer_id=alert.dealer_id,
        dealer_name=alert.dealer.name if alert.dealer else None,
        alert_type=alert.alert_type,
        severity=alert.severity,
        details_json=alert.details_json,
        resolved=alert.resolved,
        resolved_by=alert.resolved_by,
        resolved_at=alert.resolved_at,
        resolution_notes=alert.resolution_notes,
        created_at=alert.created_at,
    )


# ── Trust Score Management ────────────────────────────────────

@router.get("/dealers/{dealer_id}/trust", response_model=TrustScoreResponse)
def get_dealer_trust(
    dealer_id: str,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Get a dealer's current trust score with full penalty breakdown."""
    dealer = db.query(User).filter(User.id == dealer_id, User.role == UserRole.DEALER.value).first()
    if not dealer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dealer not found")

    breakdown = compute_trust_score(db, dealer_id)
    return TrustScoreResponse(
        dealer_id=dealer.id,
        dealer_name=dealer.name,
        trust_score=dealer.trust_score,
        trust_tier=dealer.trust_tier,
        suspended_reason=dealer.suspended_reason,
        last_computed_at=dealer.last_trust_computed_at,
        penalties=breakdown.get("penalties"),
    )


@router.post("/dealers/{dealer_id}/trust/recompute", response_model=TrustScoreResponse)
def recompute_dealer_trust(
    dealer_id: str,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Force recompute a dealer's trust score."""
    dealer = db.query(User).filter(User.id == dealer_id, User.role == UserRole.DEALER.value).first()
    if not dealer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dealer not found")

    result = update_dealer_trust(db, dealer_id)
    db.commit()
    db.refresh(dealer)

    return TrustScoreResponse(
        dealer_id=dealer.id,
        dealer_name=dealer.name,
        trust_score=dealer.trust_score,
        trust_tier=dealer.trust_tier,
        suspended_reason=dealer.suspended_reason,
        last_computed_at=dealer.last_trust_computed_at,
        penalties=result.get("penalties"),
    )


@router.post("/dealers/{dealer_id}/trust/override", response_model=TrustScoreResponse)
def override_dealer_trust(
    dealer_id: str,
    data: OverrideTrustRequest,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Manually override a dealer's trust tier (e.g., unsuspend after investigation)."""
    dealer = db.query(User).filter(User.id == dealer_id, User.role == UserRole.DEALER.value).first()
    if not dealer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dealer not found")

    # Validate tier value
    valid_tiers = [t.value for t in TrustTier]
    if data.trust_tier not in valid_tiers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid trust tier. Must be one of: {valid_tiers}"
        )

    old_tier = dealer.trust_tier
    dealer.trust_tier = data.trust_tier
    dealer.last_trust_computed_at = datetime.now(timezone.utc)

    if data.trust_tier == TrustTier.SUSPENDED.value:
        dealer.suspended_reason = f"Manual override by admin: {data.reason}"
    else:
        dealer.suspended_reason = None

    log_action(
        db=db,
        actor_id=admin.id,
        actor_role=admin.role,
        action="TRUST_OVERRIDE",
        entity_type="User",
        entity_id=dealer_id,
        details={
            "old_tier": old_tier,
            "new_tier": data.trust_tier,
            "reason": data.reason,
        },
    )

    db.commit()
    db.refresh(dealer)

    return TrustScoreResponse(
        dealer_id=dealer.id,
        dealer_name=dealer.name,
        trust_score=dealer.trust_score,
        trust_tier=dealer.trust_tier,
        suspended_reason=dealer.suspended_reason,
        last_computed_at=dealer.last_trust_computed_at,
    )


# ── Audit Chain Verification ─────────────────────────────────

@router.get("/audit/verify", response_model=AuditChainResponse)
def verify_audit_chain(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """
    Verify the integrity of the hash-chained audit log.
    Returns whether the chain is unbroken (no tampered/deleted entries).
    """
    result = verify_chain(db)
    return AuditChainResponse(**result)


@router.get("/audit/recent")
def get_recent_audit_entries(
    limit: int = Query(50, ge=1, le=500),
    action: Optional[str] = Query(None),
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Get recent audit log entries for review."""
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    entries = query.order_by(AuditLog.id.desc()).limit(limit).all()
    return [
        {
            "id": e.id,
            "timestamp": e.timestamp,
            "actor_id": e.actor_id,
            "actor_role": e.actor_role,
            "action": e.action,
            "entity_type": e.entity_type,
            "entity_id": e.entity_id,
            "details": e.details_json,
            "ip_address": e.ip_address,
            "entry_hash": e.entry_hash[:16] + "...",
        }
        for e in entries
    ]


# ── Lot Approval (for PENDING_REVIEW lots from probation dealers) ──

@router.post("/lots/{lot_id}/approve", response_model=LotApprovalResponse)
def approve_pending_lot(
    lot_id: str,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Approve a lot in PENDING_REVIEW status (from a probation-tier dealer)."""
    lot = db.query(Lot).filter(Lot.lot_id == lot_id).first()
    if not lot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lot not found")

    if lot.status != LotStatus.PENDING_REVIEW.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lot is not in PENDING_REVIEW status (current: {lot.status})"
        )

    lot.status = LotStatus.POOLED.value
    lot.updated_at = datetime.now(timezone.utc)

    log_action(
        db=db,
        actor_id=admin.id,
        actor_role=admin.role,
        action="LOT_APPROVED",
        entity_type="Lot",
        entity_id=lot_id,
        details={"previous_status": LotStatus.PENDING_REVIEW.value, "new_status": LotStatus.POOLED.value},
    )

    db.commit()
    return LotApprovalResponse(
        lot_id=lot_id,
        status=LotStatus.POOLED.value,
        message="Lot approved and moved to POOLED status."
    )


@router.post("/lots/{lot_id}/reject", response_model=LotApprovalResponse)
def reject_pending_lot(
    lot_id: str,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Reject a lot in PENDING_REVIEW status — cancels the lot and releases stock."""
    lot = db.query(Lot).filter(Lot.lot_id == lot_id).first()
    if not lot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lot not found")

    if lot.status != LotStatus.PENDING_REVIEW.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lot is not in PENDING_REVIEW status (current: {lot.status})"
        )

    # Release purchases back to stock
    for p in lot.purchases:
        p.lot_id = None

    lot.status = LotStatus.CANCELLED.value
    lot.updated_at = datetime.now(timezone.utc)

    log_action(
        db=db,
        actor_id=admin.id,
        actor_role=admin.role,
        action="LOT_REJECTED",
        entity_type="Lot",
        entity_id=lot_id,
        details={"previous_status": LotStatus.PENDING_REVIEW.value, "new_status": LotStatus.CANCELLED.value},
    )

    db.commit()
    return LotApprovalResponse(
        lot_id=lot_id,
        status=LotStatus.CANCELLED.value,
        message="Lot rejected. Stock has been released back to dealer inventory."
    )
