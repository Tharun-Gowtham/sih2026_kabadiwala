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
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    DISPUTED = "DISPUTED"

class UserRole(str, Enum):
    DEALER = "DEALER"
    RECYCLER = "RECYCLER"

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

settings = Settings()
