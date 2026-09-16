import math
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.recycler import RecyclerProfile
from app.schemas.recycler import RecyclerMatchResult

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    # Earth radius in kilometers
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def match_recyclers_for_category(
    db: Session,
    category: str,
    dealer_lat: Optional[float] = None,
    dealer_lon: Optional[float] = None,
    default_lat: float = 28.6139,  # Default: Delhi coordinates if not set
    default_lon: float = 77.2090
) -> List[RecyclerMatchResult]:
    ref_lat = dealer_lat if dealer_lat is not None else default_lat
    ref_lon = dealer_lon if dealer_lon is not None else default_lon

    # Query all recycler profiles
    profiles = db.query(RecyclerProfile).join(User, RecyclerProfile.user_id == User.id).all()
    
    candidates = []
    for profile in profiles:
        # Check if recycler accepts the specified category
        if category not in (profile.accepted_categories or []):
            continue
        
        # Check if rate is configured
        rate = (profile.rates or {}).get(category)
        if rate is None or rate <= 0:
            continue
        
        # Calculate distance
        r_lat = profile.latitude if profile.latitude is not None else ref_lat + 0.1
        r_lon = profile.longitude if profile.longitude is not None else ref_lon + 0.1
        dist_km = haversine_distance_km(ref_lat, ref_lon, r_lat, r_lon)
        
        candidates.append({
            "recycler_id": profile.user_id,
            "company_name": profile.company_name,
            "category": category,
            "rate_per_kg": float(rate),
            "distance_km": float(dist_km),
            "pickup_available": bool(profile.pickup_available),
            "service_radius_km": float(profile.service_radius_km)
        })

    if not candidates:
        return []

    # Calculate normalization baselines
    max_rate = max(c["rate_per_kg"] for c in candidates)
    min_rate = min(c["rate_per_kg"] for c in candidates)
    max_dist = max(c["distance_km"] for c in candidates)
    min_dist = min(c["distance_km"] for c in candidates)

    results = []
    for c in candidates:
        # 1. Distance Score (50%) -> Closer is better
        if max_dist == min_dist:
            dist_score = 1.0
        else:
            dist_score = 1.0 - ((c["distance_km"] - min_dist) / (max_dist - min_dist))

        # 2. Rate Score (30%) -> Higher rate is better
        if max_rate == min_rate:
            rate_score = 1.0
        else:
            rate_score = (c["rate_per_kg"] - min_rate) / (max_rate - min_rate)

        # 3. Pickup Availability (20%)
        pickup_score = 1.0 if c["pickup_available"] else 0.0

        total_score = round((0.50 * dist_score) + (0.30 * rate_score) + (0.20 * pickup_score), 4)

        results.append({
            **c,
            "score": total_score
        })

    # Sort descending by score, then distance ascending, then rate descending
    results.sort(key=lambda x: (-x["score"], x["distance_km"], -x["rate_per_kg"]))

    match_results = []
    for rank, item in enumerate(results, start=1):
        match_results.append(
            RecyclerMatchResult(
                recycler_id=item["recycler_id"],
                company_name=item["company_name"],
                category=item["category"],
                rate_per_kg=item["rate_per_kg"],
                distance_km=item["distance_km"],
                pickup_available=item["pickup_available"],
                score=item["score"],
                match_score=item["score"],
                rank=rank
            )
        )

    return match_results
