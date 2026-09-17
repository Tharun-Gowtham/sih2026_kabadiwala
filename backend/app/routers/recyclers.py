from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_recycler, get_current_dealer, get_current_user
from app.core.config import MaterialCategory, LotStatus
from app.models.user import User
from app.models.recycler import RecyclerProfile
from app.models.lot import Lot
from app.schemas.recycler import (
    RecyclerProfileUpdate,
    RecyclerProfileResponse,
    RecyclerMatchResult
)
from app.schemas.lot import LotResponse
from app.services.matching import match_recyclers_for_category

router = APIRouter(prefix="/recyclers", tags=["Recycler Operations"])

@router.get("/profile", response_model=RecyclerProfileResponse)
def get_my_profile(
    current_recycler: User = Depends(get_current_recycler),
    db: Session = Depends(get_db)
):
    profile = db.query(RecyclerProfile).filter(RecyclerProfile.user_id == current_recycler.id).first()
    if not profile:
        profile = RecyclerProfile(
            user_id=current_recycler.id,
            company_name=current_recycler.name,
            accepted_categories=[],
            rates={},
            pickup_available=False,
            service_radius_km=50.0,
            latitude=current_recycler.latitude,
            longitude=current_recycler.longitude
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile

@router.put("/profile", response_model=RecyclerProfileResponse)
def update_my_profile(
    data: RecyclerProfileUpdate,
    current_recycler: User = Depends(get_current_recycler),
    db: Session = Depends(get_db)
):
    profile = db.query(RecyclerProfile).filter(RecyclerProfile.user_id == current_recycler.id).first()
    if not profile:
        profile = RecyclerProfile(user_id=current_recycler.id, company_name=current_recycler.name)
        db.add(profile)

    if data.company_name is not None:
        profile.company_name = data.company_name
        current_recycler.name = data.company_name

    profile.accepted_categories = [c.value for c in data.accepted_categories]
    profile.rates = data.rates
    profile.pickup_available = data.pickup_available
    profile.service_radius_km = data.service_radius_km

    if data.latitude is not None:
        profile.latitude = data.latitude
        current_recycler.latitude = data.latitude
    if data.longitude is not None:
        profile.longitude = data.longitude
        current_recycler.longitude = data.longitude

    profile.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(profile)
    return profile

@router.get("/match", response_model=List[RecyclerMatchResult])
def match_recyclers(
    category: MaterialCategory,
    dealer_lat: Optional[float] = Query(None),
    dealer_lon: Optional[float] = Query(None),
    current_dealer: User = Depends(get_current_dealer),
    db: Session = Depends(get_db)
):
    """
    Ranks eligible recyclers using the prototype weighting:
    - Distance: 50%
    - Rate: 30%
    - Pickup availability: 20%
    """
    lat = dealer_lat if dealer_lat is not None else current_dealer.latitude
    lon = dealer_lon if dealer_lon is not None else current_dealer.longitude

    results = match_recyclers_for_category(
        db=db,
        category=category.value,
        dealer_lat=lat,
        dealer_lon=lon
    )
    return results

@router.get("/lots", response_model=List[LotResponse])
def list_incoming_lots(
    status: Optional[str] = Query(None),
    current_recycler: User = Depends(get_current_recycler),
    db: Session = Depends(get_db)
):
    query = db.query(Lot).filter(Lot.recycler_id == current_recycler.id)
    if status:
        query = query.filter(Lot.status == status)
    else:
        # Default: pending handover
        query = query.filter(Lot.status.in_([LotStatus.PENDING_HANDOVER.value, LotStatus.COMPLETED.value]))

    lots = query.order_by(Lot.created_at.desc()).all()
    return [
        LotResponse(
            lot_id=l.lot_id,
            dealer_id=l.dealer_id,
            dealer_name=l.dealer.name if l.dealer else None,
            category=l.category,
            declared_weight=l.declared_weight,
            recycler_id=l.recycler_id,
            recycler_name=current_recycler.name,
            status=l.status,
            created_at=l.created_at,
            updated_at=l.updated_at
        )
        for l in lots
    ]
