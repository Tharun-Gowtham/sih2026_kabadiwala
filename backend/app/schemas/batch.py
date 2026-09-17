from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class RouteStop(BaseModel):
    """One stop in the ordered milk-run route."""
    lot_id: str
    lat: float
    lng: float
    dealer_name: str
    stop_number: int
    estimated_arrival_minutes: Optional[int] = None


class BatchLotItem(BaseModel):
    """Lightweight lot info embedded in a batch response."""
    lot_id: str
    dealer_id: str
    dealer_name: Optional[str] = None
    declared_weight: float
    lat: Optional[float] = None
    lng: Optional[float] = None


class BatchResponse(BaseModel):
    """Full batch detail — used for the batch detail view and route display."""
    batch_id: str
    material_category: str
    geohash_cell: str
    centroid_lat: Optional[float] = None
    centroid_lon: Optional[float] = None
    total_weight_kg: float
    lot_count: int = 0
    status: str
    recycler_id: Optional[str] = None
    recycler_name: Optional[str] = None
    route_json: Optional[List[Any]] = None
    pickup_scheduled_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    lots: List[BatchLotItem] = []

    model_config = ConfigDict(from_attributes=True)


class BatchListItem(BaseModel):
    """Compact summary for the recycler 'Available Batches' list."""
    batch_id: str
    material_category: str
    geohash_cell: str
    total_weight_kg: float
    num_stops: int
    status: str
    centroid_lat: Optional[float] = None
    centroid_lon: Optional[float] = None
    pickup_scheduled_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BatchFormResult(BaseModel):
    """Response from POST /batches/form — reports how many batches were created."""
    batches_formed: int
    message: str


class BatchDispatchResponse(BaseModel):
    """Response from POST /batches/{id}/dispatch."""
    batch_id: str
    status: str
    pickup_scheduled_at: Optional[datetime]
    fcm_notifications_sent: int
    message: str


class BatchRouteResponse(BaseModel):
    """Response from GET /batches/{id}/route — the ordered stop list for map display."""
    batch_id: str
    total_stops: int
    total_distance_km: float
    route: List[RouteStop]
