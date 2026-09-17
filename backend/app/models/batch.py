import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.core.config import BatchStatus


class Batch(Base):
    """
    A milk-run pickup batch — groups nearby lots of the same material category
    within a single geohash cell into one recycler pickup trip.

    Lifecycle:  FORMING → READY → ASSIGNED → DISPATCHED → COMPLETED
    """
    __tablename__ = "batches"

    batch_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    material_category = Column(String(50), nullable=False, index=True)
    geohash_cell = Column(String(12), nullable=False, index=True)

    # Centroid of all included lot coordinates (average lat/lng)
    centroid_lat = Column(Float, nullable=True)
    centroid_lon = Column(Float, nullable=True)

    total_weight_kg = Column(Float, nullable=False, default=0.0)

    status = Column(
        String(20),
        nullable=False,
        default=BatchStatus.FORMING.value,
        index=True
    )

    # Assigned recycler (set when a recycler accepts the batch)
    recycler_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Ordered list of pickup stops as computed by nearest-neighbor routing.
    # Schema: [{
    #   "lot_id": str,
    #   "lat": float,
    #   "lng": float,
    #   "dealer_name": str,
    #   "stop_number": int,
    #   "estimated_arrival_minutes": int (set on dispatch)
    # }]
    route_json = Column(JSON, nullable=True)

    # Set when recycler dispatches — estimated pickup time derived from route distance + avg speed
    pickup_scheduled_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    recycler = relationship("User", foreign_keys=[recycler_id])
    batch_lots = relationship("BatchLot", back_populates="batch", cascade="all, delete-orphan")


class BatchLot(Base):
    """
    Join table: links a Batch to the Lots it will collect.
    A lot can only belong to one active batch at a time (enforced by batch_status='batched').
    """
    __tablename__ = "batch_lots"

    batch_id = Column(
        String(36),
        ForeignKey("batches.batch_id", ondelete="CASCADE"),
        primary_key=True
    )
    lot_id = Column(
        String(36),
        ForeignKey("lots.lot_id", ondelete="CASCADE"),
        primary_key=True
    )

    # Relationships
    batch = relationship("Batch", back_populates="batch_lots")
    lot = relationship("Lot", back_populates="batch_lots")
