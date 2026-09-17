# Kabadiwala Connect — Authoritative Backend API

This is the authoritative backend system of record for **Kabadiwala Connect**, providing digital traceability and workflow coordination across door-to-door Collectors, Dealers, and Recyclers.

---

## Getting Started

### 1. Prerequisites
- Python 3.10+ (tested on Python 3.14)
- Dependencies installed from `requirements.txt`:
  ```bash
  pip install -r requirements.txt
  ```

### 2. Running the Server
From the `backend/` directory:
```bash
python run.py
```
Or with uvicorn directly:
```bash
uvicorn app.main:app --reload --port 8000
```

The API will start at:
- **Base URL**: `http://127.0.0.1:8000`
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`
- **ReDoc Documentation**: `http://127.0.0.1:8000/redoc`

---

## Seeded Demo Accounts

On startup, the backend automatically creates SQLite database tables and seeds demo accounts:

| Role | Email | Password | Details |
|---|---|---|---|
| **Dealer** | `dealer@kabadiwala.com` | `password123` | Ramesh Scrap Traders (Mayapuri, Delhi) |
| **Recycler** | `greencycle@recycler.com` | `password123` | GreenCycle Recycling (PCB, Battery, Cable) |
| **Recycler** | `ecorecover@recycler.com` | `password123` | EcoRecover Tech (PCB, CRT, LCD, Motor/Magnet, Mixed Plastic) |
| **Recycler** | `cleanearth@recycler.com` | `password123` | CleanEarth Recycling (PCB, LCD, Mixed Plastic) |

Initial available stock is pre-seeded for the dealer in PCB, Cable, and Battery.

---

## Core API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/register`: Register new DEALER or RECYCLER
- `POST /api/auth/login`: Authenticate and receive JWT bearer token
- `GET /api/auth/me`: Get current authenticated user profile

### Purchases & Offline Sync (`/api/purchases`)
- `POST /api/purchases`: Record purchase (offline-first UUID idempotency enforced)
- `POST /api/purchases/sync`: Batch offline synchronization (duplicate-safe)
- `GET /api/purchases`: List dealer's recorded purchases

### Stock Management (`/api/stock`)
- `GET /api/stock`: Aggregated stock by category (`AVAILABLE`, `POOLED`, `COMPLETED`)

### Lots (`/api/lots`)
- `POST /api/lots`: Create single-category lot from available stock
- `GET /api/lots`: List dealer's lots
- `GET /api/lots/{lot_id}`: Authoritative lot lookup
- `PATCH /api/lots/{lot_id}/assign-recycler`: Associate lot with a recycler

### QR Handover Lookup (`/api/qr`)
- `GET /api/qr/lookup/{lot_id}`: Read-only authoritative lot lookup from scanned UUID

### Recycler Operations (`/api/recyclers`)
- `GET /api/recyclers/profile`: Current recycler's profile and rates
- `PUT /api/recyclers/profile`: Update accepted categories, rates, pickup availability
- `GET /api/recyclers/match`: Ranked recycler recommendation (50% Distance, 30% Rate, 20% Pickup)
- `GET /api/recyclers/lots`: List assigned incoming lots

### Handover & Verification (`/api/handover`)
- `POST /api/handover/verify/{lot_id}`: Physical weight verification with >30% discrepancy detection
- `POST /api/handover/confirm/{lot_id}`: Atomic, duplicate-proof confirmation and transaction creation

### Dealer Ledger (`/api/dealers`)
- `GET /api/dealers/ledger`: Ledger summary (expenditure vs confirmed earnings vs pending)

### Transactions & Traceability Records (`/api/transactions`)
- `GET /api/transactions`: Transaction history
- `GET /api/transactions/{transaction_id}/record`: Platform verified record data
- `GET /api/transactions/{transaction_id}/pdf`: Downloadable verified transaction PDF

---

## Running Automated Tests

Run the full pytest suite:
```bash
python -m pytest tests -v
```
All 18 test suites test the 17 criteria mandated by `docs/backendleadtask.md`.
