from typing import List, Optional
from pydantic import BaseModel

class StockCategorySummary(BaseModel):
    category: str
    available_weight: float
    total_purchased_weight: float
    pooled_weight: float
    completed_weight: float
    purchase_count: int

class StockResponse(BaseModel):
    total_available_weight: float
    categories: List[StockCategorySummary]
    items: Optional[List[StockCategorySummary]] = None
