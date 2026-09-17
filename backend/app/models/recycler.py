import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class RecyclerProfile(Base):
    __tablename__ = "recycler_profiles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    company_name = Column(String(255), nullable=False)
    accepted_categories = Column(JSON, default=list, nullable=False)  # List[str]
    rates = Column(JSON, default=dict, nullable=False)  # Dict[str, float] -> Rate per kg
    pickup_available = Column(Boolean, default=False, nullable=False)
    service_radius_km = Column(Float, default=50.0, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="recycler_profile")
