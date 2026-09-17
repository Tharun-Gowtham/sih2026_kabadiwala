"""
Fraud Detection Engine — Dealer Trust Score & Anomaly Detection
================================================================

Computes a dynamic trust score (0–100) per dealer based on 6 behavioral signals:

  1. Discrepancy Rate   — % of transactions where |declared − verified| > 5%   (−30 pts max)
  2. Purchase Velocity  — Purchases/hour exceeding physical collection norms   (−20 pts max)
  3. Cancellation Rate  — cancelled_lots / total_lots > 30%                    (−15 pts max)
  4. Weight Consistency — Std deviation spikes within a category               (−15 pts max)
  5. Photo Compliance   — % of purchases > 5kg without photo proof             (−10 pts max)
  6. GPS Drift          — Purchases from distant locations in short windows     (−10 pts max)

Trust Tiers:
  80–100 → TRUSTED    : Normal operation
  60–79  → WATCH      : Flagged for manual review
  40–59  → PROBATION  : Lots need admin approval
  0–39   → SUSPENDED  : Cannot create lots; investigation required
"""

import math
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional, List
from collections import defaultdict

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.config import settings, TrustTier
from app.models.user import User
from app.models.purchase import Purchase
from app.models.lot import Lot
from app.models.transaction import Transaction
from app.models.fraud_alert import FraudAlert
from app.services.matching import haversine_distance_km

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────
# Signal 1: Discrepancy Rate  (max penalty: −30)
# ──────────────────────────────────────────────────────────────────

def _discrepancy_penalty(db: Session, dealer_id: str) -> float:
    """Penalize dealers whose declared weights consistently differ from verified weights."""
    txs = db.query(Transaction).filter(Transaction.dealer_id == dealer_id).all()
    if not txs:
        return 0.0  # No history — no penalty

    flagged = sum(1 for t in txs if t.discrepancy_percentage > 5.0)
    rate = flagged / len(txs)
    # Linear scale: rate 0 → penalty 0, rate 1.0 → penalty 30
    return min(30.0, rate * 30.0)


# ──────────────────────────────────────────────────────────────────
# Signal 2: Purchase Velocity  (max penalty: −20)
# ──────────────────────────────────────────────────────────────────

def _velocity_penalty(db: Session, dealer_id: str) -> float:
    """Penalize abnormally high purchase rates (more than MAX_PURCHASES_PER_HOUR)."""
    # Look at the last 24 hours
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    recent = (
        db.query(Purchase)
        .filter(Purchase.dealer_id == dealer_id, Purchase.created_at >= cutoff)
        .order_by(Purchase.created_at.asc())
        .all()
    )
    if len(recent) < 2:
        return 0.0

    # Check each 1-hour sliding window
    max_in_window = 0
    for i, p in enumerate(recent):
        window_end = p.created_at + timedelta(hours=1)
        count = sum(1 for r in recent[i:] if r.created_at <= window_end)
        max_in_window = max(max_in_window, count)

    if max_in_window <= settings.MAX_PURCHASES_PER_HOUR:
        return 0.0

    excess_ratio = (max_in_window - settings.MAX_PURCHASES_PER_HOUR) / settings.MAX_PURCHASES_PER_HOUR
    return min(20.0, excess_ratio * 20.0)


# ──────────────────────────────────────────────────────────────────
# Signal 3: Cancellation Rate  (max penalty: −15)
# ──────────────────────────────────────────────────────────────────

def _cancellation_penalty(db: Session, dealer_id: str) -> float:
    """Penalize high lot cancellation rates (>30% of total lots)."""
    total = db.query(Lot).filter(Lot.dealer_id == dealer_id).count()
    if total == 0:
        return 0.0

    cancelled = db.query(Lot).filter(
        Lot.dealer_id == dealer_id, Lot.status == "CANCELLED"
    ).count()

    rate = cancelled / total
    if rate <= 0.3:
        return 0.0

    # Scale penalty for rates above 30%: 30%→0, 100%→15
    return min(15.0, ((rate - 0.3) / 0.7) * 15.0)


# ──────────────────────────────────────────────────────────────────
# Signal 4: Weight Consistency  (max penalty: −15)
# ──────────────────────────────────────────────────────────────────

def _weight_consistency_penalty(db: Session, dealer_id: str) -> float:
    """Penalize sudden weight spikes (high std deviation) within categories."""
    purchases = (
        db.query(Purchase)
        .filter(Purchase.dealer_id == dealer_id)
        .all()
    )
    if len(purchases) < 5:
        return 0.0  # Not enough data

    # Group by category
    by_cat: Dict[str, List[float]] = defaultdict(list)
    for p in purchases:
        by_cat[p.category].append(p.weight)

    max_cv = 0.0  # coefficient of variation
    for cat, weights in by_cat.items():
        if len(weights) < 3:
            continue
        mean = sum(weights) / len(weights)
        if mean == 0:
            continue
        variance = sum((w - mean) ** 2 for w in weights) / len(weights)
        std = math.sqrt(variance)
        cv = std / mean
        max_cv = max(max_cv, cv)

    # CV > 2.0 is highly suspicious (some weights are 3x+ the average)
    if max_cv <= 0.5:
        return 0.0
    return min(15.0, ((max_cv - 0.5) / 1.5) * 15.0)


# ──────────────────────────────────────────────────────────────────
# Signal 5: Photo Compliance  (max penalty: −10)
# ──────────────────────────────────────────────────────────────────

def _photo_compliance_penalty(db: Session, dealer_id: str) -> float:
    """Penalize purchases above PHOTO_REQUIRED_WEIGHT_KG without photo proof."""
    large_purchases = (
        db.query(Purchase)
        .filter(
            Purchase.dealer_id == dealer_id,
            Purchase.weight >= settings.PHOTO_REQUIRED_WEIGHT_KG,
        )
        .all()
    )
    if not large_purchases:
        return 0.0

    missing = sum(1 for p in large_purchases if not p.photo_url)
    rate = missing / len(large_purchases)
    return min(10.0, rate * 10.0)


# ──────────────────────────────────────────────────────────────────
# Signal 6: GPS Drift  (max penalty: −10)
# ──────────────────────────────────────────────────────────────────

def _gps_drift_penalty(db: Session, dealer_id: str) -> float:
    """Penalize purchases claimed from wildly different GPS locations in short windows."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    recent = (
        db.query(Purchase)
        .filter(
            Purchase.dealer_id == dealer_id,
            Purchase.created_at >= cutoff,
            Purchase.gps_latitude.isnot(None),
            Purchase.gps_longitude.isnot(None),
        )
        .order_by(Purchase.created_at.asc())
        .all()
    )

    if len(recent) < 2:
        return 0.0

    # Check consecutive purchases — flag if > 50km apart within 1 hour
    drift_count = 0
    for i in range(len(recent) - 1):
        p1, p2 = recent[i], recent[i + 1]
        time_diff = (p2.created_at - p1.created_at).total_seconds()
        if time_diff > 3600:  # Only check pairs within 1 hour
            continue
        dist = haversine_distance_km(
            p1.gps_latitude, p1.gps_longitude,
            p2.gps_latitude, p2.gps_longitude,
        )
        if dist > 50.0:  # 50km in under 1 hour is suspicious
            drift_count += 1

    if drift_count == 0:
        return 0.0

    return min(10.0, drift_count * 5.0)


# ──────────────────────────────────────────────────────────────────
# Trust Score Computation
# ──────────────────────────────────────────────────────────────────

def compute_trust_score(db: Session, dealer_id: str) -> Dict:
    """
    Compute the trust score for a dealer and return a detailed breakdown.

    Returns:
        {
            "trust_score": float,
            "trust_tier": str,
            "penalties": {
                "discrepancy": float,
                "velocity": float,
                "cancellation": float,
                "weight_consistency": float,
                "photo_compliance": float,
                "gps_drift": float,
            },
            "total_penalty": float,
        }
    """
    penalties = {
        "discrepancy": round(_discrepancy_penalty(db, dealer_id), 2),
        "velocity": round(_velocity_penalty(db, dealer_id), 2),
        "cancellation": round(_cancellation_penalty(db, dealer_id), 2),
        "weight_consistency": round(_weight_consistency_penalty(db, dealer_id), 2),
        "photo_compliance": round(_photo_compliance_penalty(db, dealer_id), 2),
        "gps_drift": round(_gps_drift_penalty(db, dealer_id), 2),
    }

    total_penalty = sum(penalties.values())
    score = max(0.0, min(100.0, 100.0 - total_penalty))

    # Determine tier
    if score >= 80:
        tier = TrustTier.TRUSTED.value
    elif score >= 60:
        tier = TrustTier.WATCH.value
    elif score >= 40:
        tier = TrustTier.PROBATION.value
    else:
        tier = TrustTier.SUSPENDED.value

    return {
        "trust_score": round(score, 2),
        "trust_tier": tier,
        "penalties": penalties,
        "total_penalty": round(total_penalty, 2),
    }


def update_dealer_trust(db: Session, dealer_id: str) -> Dict:
    """
    Recompute and persist the dealer's trust score.
    Generates a FraudAlert if the tier drops to WATCH or below.
    Returns the trust breakdown.
    """
    dealer = db.query(User).filter(User.id == dealer_id).first()
    if not dealer:
        return {}

    result = compute_trust_score(db, dealer_id)
    old_tier = dealer.trust_tier
    new_tier = result["trust_tier"]

    dealer.trust_score = result["trust_score"]
    dealer.trust_tier = new_tier
    dealer.last_trust_computed_at = datetime.now(timezone.utc)

    # Auto-set suspension reason when tier drops to SUSPENDED
    if new_tier == TrustTier.SUSPENDED.value and old_tier != TrustTier.SUSPENDED.value:
        top_penalty = max(result["penalties"].items(), key=lambda x: x[1])
        dealer.suspended_reason = (
            f"Auto-suspended: Trust score dropped to {result['trust_score']}. "
            f"Primary factor: {top_penalty[0]} (penalty: -{top_penalty[1]})"
        )

    # Generate alert on tier degradation
    if old_tier != new_tier and new_tier in (
        TrustTier.WATCH.value, TrustTier.PROBATION.value, TrustTier.SUSPENDED.value
    ):
        severity = {
            TrustTier.WATCH.value: "MEDIUM",
            TrustTier.PROBATION.value: "HIGH",
            TrustTier.SUSPENDED.value: "CRITICAL",
        }.get(new_tier, "MEDIUM")

        alert = FraudAlert(
            alert_id=str(uuid.uuid4()),
            dealer_id=dealer_id,
            alert_type="TRUST_DEGRADATION",
            severity=severity,
            details_json={
                "old_tier": old_tier,
                "new_tier": new_tier,
                "trust_score": result["trust_score"],
                "penalties": result["penalties"],
            },
            created_at=datetime.now(timezone.utc),
        )
        db.add(alert)
        logger.warning(
            f"FRAUD ALERT: Dealer {dealer_id} trust degraded "
            f"{old_tier} → {new_tier} (score={result['trust_score']})"
        )

    db.flush()
    return result


def create_fraud_alert(
    db: Session,
    dealer_id: str,
    alert_type: str,
    severity: str,
    details: Optional[Dict] = None,
) -> FraudAlert:
    """Create a standalone fraud alert (e.g., from velocity checks in routers)."""
    alert = FraudAlert(
        alert_id=str(uuid.uuid4()),
        dealer_id=dealer_id,
        alert_type=alert_type,
        severity=severity,
        details_json=details,
        created_at=datetime.now(timezone.utc),
    )
    db.add(alert)
    db.flush()
    logger.warning(f"FRAUD ALERT [{severity}]: {alert_type} for dealer {dealer_id}")
    return alert
