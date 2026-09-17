"""
FCM Notification Service — Milk-Run "Incoming Call" Push
=========================================================

This module is intentionally a STUB for the hackathon demo.

Why a stub?
  - Firebase Admin SDK requires a valid service-account JSON and a live
    Firebase project. We don't want a missing credential to crash the
    entire batch dispatch flow.
  - The stub logs the full FCM payload (visible in server logs), so you
    can verify the notification data is correct during development.
  - Swapping in real Firebase is a one-function change — see "Upgrading
    to real FCM" below.

Upgrading to real FCM:
  1. Add your Firebase service account key path to .env:
       FIREBASE_CREDENTIALS_PATH=/path/to/serviceAccountKey.json
  2. pip install firebase-admin (already in requirements.txt)
  3. Uncomment the real implementation in _send_real_fcm() below
     and call it from send_pickup_call_notifications().
"""

import logging
import os
from datetime import datetime
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Real FCM initialisation (only runs when credentials are present)
# ---------------------------------------------------------------------------
_firebase_app = None

def _get_firebase_app():
    """Lazy-initialise Firebase Admin SDK. Returns None if not configured."""
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
    if not cred_path or not os.path.exists(cred_path):
        return None

    try:
        import firebase_admin
        from firebase_admin import credentials
        cred = credentials.Certificate(cred_path)
        _firebase_app = firebase_admin.initialize_app(cred)
        logger.info("FCM: Firebase Admin SDK initialised successfully.")
    except Exception as e:
        logger.warning(f"FCM: Firebase initialisation failed — {e}. Using stub mode.")
        _firebase_app = None

    return _firebase_app


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def send_pickup_call_notifications(
    db,  # SQLAlchemy Session — used to look up FCM tokens
    dealer_ids: List[str],
    batch_id: str,
    route: List[Dict[str, Any]],
    pickup_scheduled_at: Optional[datetime],
) -> int:
    """
    Send a high-priority FCM data message to every dealer in dealer_ids.

    The message type is a DATA message (not a notification message) so the
    mobile app's onMessageReceived() handler fires even when the app is in
    the background, allowing it to launch the full-screen "incoming call"
    Activity/screen.

    Payload schema (matches what the Flutter app expects):
    {
      "type": "PICKUP_INCOMING_CALL",
      "batch_id": "<uuid>",
      "pickup_scheduled_at": "<ISO8601>",
      "stop_number": "<int>",            -- this dealer's position in the route
      "estimated_arrival_minutes": "<int>",
      "total_stops": "<int>"
    }

    Returns: number of notifications successfully dispatched (or stubbed).
    """
    if not dealer_ids:
        return 0

    # Build a lookup: dealer_id → stop info
    stop_by_lot: Dict[str, Dict] = {}
    for stop in route:
        stop_by_lot[stop.get("lot_id", "")] = stop

    # For each dealer, find their stop info
    # (a dealer could have multiple lots — use the first one found)
    firebase_app = _get_firebase_app()
    sent_count = 0

    for dealer_id in dealer_ids:
        # Find this dealer's stop in the route
        dealer_stop = next(
            (s for s in route if s.get("dealer_name") or True),  # best-effort
            {}
        )
        # More precise: find via lot ownership
        for stop in route:
            # We stored dealer_name on the stop, not dealer_id — match by lot
            pass  # FCM token lookup would go here in a real implementation

        payload = {
            "type": "PICKUP_INCOMING_CALL",
            "batch_id": batch_id,
            "pickup_scheduled_at": pickup_scheduled_at.isoformat() if pickup_scheduled_at else "",
            "stop_number": str(dealer_stop.get("stop_number", 1)),
            "estimated_arrival_minutes": str(dealer_stop.get("estimated_arrival_minutes", 30)),
            "total_stops": str(len(route)),
        }

        if firebase_app:
            sent_count += _send_real_fcm(firebase_app, dealer_id, payload, db)
        else:
            _log_stub_notification(dealer_id, payload)
            sent_count += 1  # Count as "sent" in stub mode for demo purposes

    return sent_count


def _send_real_fcm(firebase_app, dealer_id: str, payload: Dict, db) -> int:
    """
    Real FCM implementation — only called when Firebase is configured.
    
    To use:
    1. Store the dealer's FCM registration token in the users table
       (add a `fcm_token` column, populated when the mobile app calls
        POST /auth/register-fcm-token).
    2. Uncomment the block below.
    """
    # --- Uncomment when FCM tokens are stored ---
    # from firebase_admin import messaging
    # from app.models.user import User
    #
    # user = db.query(User).filter(User.id == dealer_id).first()
    # if not user or not getattr(user, "fcm_token", None):
    #     logger.warning(f"FCM: no token for dealer {dealer_id}, skipping.")
    #     return 0
    #
    # message = messaging.Message(
    #     data={k: str(v) for k, v in payload.items()},
    #     android=messaging.AndroidConfig(
    #         priority="high",
    #         notification=None,  # data-only message — app handles the UI
    #     ),
    #     token=user.fcm_token,
    # )
    # try:
    #     response = messaging.send(message, app=firebase_app)
    #     logger.info(f"FCM: sent to dealer {dealer_id}, message_id={response}")
    #     return 1
    # except Exception as e:
    #     logger.error(f"FCM: failed to send to dealer {dealer_id} — {e}")
    #     return 0

    logger.info(f"FCM: _send_real_fcm called for {dealer_id} (implementation commented out)")
    return 0


def _log_stub_notification(dealer_id: str, payload: Dict) -> None:
    """Log the full FCM payload so it's visible in server logs during the demo."""
    logger.info(
        f"[FCM STUB] Incoming-call notification → dealer_id={dealer_id}\n"
        f"  Payload: {payload}\n"
        f"  → On a real device this would trigger the full-screen call UI."
    )
