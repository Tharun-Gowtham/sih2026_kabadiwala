from typing import Optional, List, Dict
from datetime import datetime
from pydantic import BaseModel, Field, model_validator, ConfigDict
from app.core.config import MaterialCategory

class RecyclerProfileUpdate(BaseModel):
    company_name: Optional[str] = Field(None, min_length=2)
    accepted_categories: List[MaterialCategory] = Field(default_factory=list)
    rates: Dict[str, float] = Field(default_factory=dict, description="Rate in INR per kg for accepted categories")
    pickup_available: bool = False
    service_radius_km: float = Field(default=50.0, gt=0)
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    @model_validator(mode="after")
    def validate_rates_match_accepted(self):
        accepted_set = {cat.value for cat in self.accepted_categories}
        for cat_name, rate in self.rates.items():
            if cat_name not in accepted_set:
                raise ValueError(f"Rate configured for category '{cat_name}' which is not in accepted_categories")
            if rate <= 0:
                raise ValueError(f"Rate for '{cat_name}' must be greater than 0")
        return self

class RecyclerProfileResponse(BaseModel):
    id: str
    user_id: str
    company_name: str
    accepted_categories: List[str]
    rates: Dict[str, float]
    pickup_available: bool
    service_radius_km: float
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class RecyclerMatchResult(BaseModel):
    recycler_id: str
    company_name: str
    category: str
    rate_per_kg: float
    distance_km: float
    pickup_available: bool
    score: float
    match_score: Optional[float] = None
    rank: int
