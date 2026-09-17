from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.core.config import MaterialCategory, SyncStatus

class PurchaseCreate(BaseModel):
    purchase_id: Optional[str] = Field(None, description="Client generated UUID for offline sync idempotency")
    category: MaterialCategory
    weight: float = Field(..., gt=0, description="Weight in kg, must be greater than 0")
    price: float = Field(..., ge=0, description="Total purchase cost paid by dealer")
    unit_price: Optional[float] = Field(None, ge=0, description="Price per kg")
    collector_reference: Optional[str] = None
    photo_url: Optional[str] = None
    created_at: Optional[datetime] = None
    # Fraud detection fields
    gps_latitude: Optional[float] = Field(None, description="GPS latitude at point-of-purchase")
    gps_longitude: Optional[float] = Field(None, description="GPS longitude at point-of-purchase")

class PurchaseResponse(BaseModel):
    purchase_id: str
    dealer_id: str
    category: str
    weight: float
    price: float
    unit_price: Optional[float] = None
    sync_status: str
    lot_id: Optional[str] = None
    collector_reference: Optional[str] = None
    photo_url: Optional[str] = None
    created_at: datetime
    synced_at: Optional[datetime] = None
    # Fraud detection fields
    photo_hash: Optional[str] = None
    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None
    photo_verified: bool = False

    model_config = ConfigDict(from_attributes=True)

class SyncPurchasesRequest(BaseModel):
    purchases: List[PurchaseCreate] = Field(..., min_length=1)

class SyncPurchasesResponse(BaseModel):
    synced_count: int
    existing_count: int
    purchases: List[PurchaseResponse]
