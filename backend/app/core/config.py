import os
from typing import List
from enum import Enum
from pydantic_settings import BaseSettings, SettingsConfigDict

class MaterialCategory(str, Enum):
    PCB = "PCB"
    CRT = "CRT"
    LCD = "LCD"
    CABLE = "Cable"
    BATTERY = "Battery"
    MOTOR_MAGNET = "Motor/Magnet"
    MIXED_PLASTIC = "Mixed Plastic"

class LotStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    POOLED = "POOLED"
    PENDING_HANDOVER = "PENDING_HANDOVER"
    PENDING_REVIEW = "PENDING_REVIEW"  # Probation dealers require admin approval
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    DISPUTED = "DISPUTED"

class BatchStatus(str, Enum):
    FORMING = "FORMING"
    READY = "READY"
    ASSIGNED = "ASSIGNED"
    DISPATCHED = "DISPATCHED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class UserRole(str, Enum):
    DEALER = "DEALER"
    RECYCLER = "RECYCLER"
    ADMIN = "ADMIN"

class TrustTier(str, Enum):
    TRUSTED = "TRUSTED"       # Score 80-100: Normal operation
    WATCH = "WATCH"           # Score 60-79: Flagged for review
    PROBATION = "PROBATION"   # Score 40-59: Lots need admin approval
    SUSPENDED = "SUSPENDED"   # Score 0-39: Cannot create lots

class SyncStatus(str, Enum):
    PENDING_SYNC = "PENDING_SYNC"
    SYNCING = "SYNCING"
    SYNCED = "SYNCED"
    FAILED = "FAILED"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=True)

    PROJECT_NAME: str = "Kabadiwala Connect API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-kabadiwala-key-2026-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./kabadiwala.db")
    CORS_ORIGINS: List[str] = ["*"]

    # Strict business constants
    VALID_CATEGORIES: List[str] = [c.value for c in MaterialCategory]
    DISCREPANCY_THRESHOLD_PERCENT: float = 30.0

    # Milk-Run Pooling constants
    BATCH_THRESHOLD_KG: float = 20.0          # Min kg in a geohash cell to form a batch
    BATCH_MAX_WAIT_HOURS: int = 48            # Starvation fallback — force-form if oldest lot >= N hours
    GEOHASH_PRECISION: int = 6               # ~1.2km x 0.6km cells
    AUTO_BATCH_ON_LOT_CREATE: bool = True    # Auto-trigger batch formation on new lot
    BATCH_AVG_SPEED_KMH: float = 30.0       # Average van speed in km/h for ETA estimates

    # ── Fraud Prevention Thresholds ──────────────────────────────
    MAX_PURCHASES_PER_HOUR: int = 20              # Physical collection limit
    MAX_DAILY_WEIGHT_KG: float = 500.0            # Daily weight cap per dealer
    MIN_PURCHASE_INTERVAL_SECONDS: int = 60       # Minimum seconds between purchases
    CRITICAL_DISCREPANCY_PERCENT: float = 50.0    # Hard-block handover confirmation
    MIN_HANDOVER_WAIT_MINUTES: int = 30           # Cooling period before confirmation
    MAX_DEALER_RECYCLER_TXN_PER_DAY: int = 10    # Anti-collusion pair cap
    PHOTO_REQUIRED_WEIGHT_KG: float = 5.0         # Photo mandatory above this weight
    ADMIN_SECRET_KEY: str = os.getenv("ADMIN_SECRET_KEY", "kabadiwala-admin-2026-secret")

settings = Settings()
