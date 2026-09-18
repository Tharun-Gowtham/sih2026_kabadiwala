import pytest
import os
import sys

# Ensure backend directory is on python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings
from app.services.seeder import seed_demo_data

# In-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    seed_demo_data(session)
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def dealer_token(client):
    res = client.post("/api/auth/login", json={"email": "dealer@kabadiwala.com", "password": "password123"})
    assert res.status_code == 200
    return res.json()["access_token"]

@pytest.fixture
def recycler_token(client):
    # GreenCycle
    res = client.post("/api/auth/login", json={"email": "greencycle@recycler.com", "password": "password123"})
    assert res.status_code == 200
    return res.json()["access_token"]

@pytest.fixture
def recycler2_token(client):
    # EcoRecover
    res = client.post("/api/auth/login", json={"email": "ecorecover@recycler.com", "password": "password123"})
    assert res.status_code == 200
    return res.json()["access_token"]
