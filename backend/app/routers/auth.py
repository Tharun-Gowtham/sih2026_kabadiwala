import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.recycler import RecyclerProfile
from app.schemas.auth import UserRegister, UserLogin, Token, UserResponse
from app.core.config import UserRole

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(data: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered"
        )

    user = User(
        id=str(uuid.uuid4()),
        email=data.email.lower(),
        password_hash=get_password_hash(data.password),
        role=data.role.value,
        name=data.name,
        phone=data.phone,
        address=data.address,
        latitude=data.latitude,
        longitude=data.longitude,
        created_at=datetime.now(timezone.utc)
    )
    db.add(user)
    db.flush()

    # Automatically initialize empty RecyclerProfile if user is RECYCLER
    if data.role == UserRole.RECYCLER:
        profile = RecyclerProfile(
            user_id=user.id,
            company_name=data.name,
            accepted_categories=[],
            rates={},
            pickup_available=False,
            service_radius_km=50.0,
            latitude=data.latitude,
            longitude=data.longitude
        )
        db.add(profile)

    db.commit()
    db.refresh(user)
    return user

@router.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(subject=user.id, role=user.role)
    return Token(
        access_token=token,
        token_type="bearer",
        role=user.role,
        user_id=user.id,
        name=user.name
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
