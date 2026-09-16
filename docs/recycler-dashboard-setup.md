# Recycler Portal Setup & Operational Guide

The **Recycler Portal** is the formal industrial interface for authorized e-waste recyclers and dismantlers. It interfaces directly with the central FastAPI backend to provide digital verification, mass-balance discrepancy auditing, and tamper-evident CPCB (Central Pollution Control Board) transaction record generation.

---

## 1. System Architecture

- **Backend**: Python FastAPI (`backend/`, running on port `8000`)
- **Database**: SQLite `backend/kabadiwala.db` (or PostgreSQL in production)
- **Frontend**: React 19 + Vite + Tailwind CSS (`recycler-dashboard-frontend/`, running on port `5174`)

---

## 2. Prerequisites

- **Node.js**: v18+ (tested on Node v20/v22)
- **Python**: v3.10+ (tested on Python 3.14)

---

## 3. How to Run Locally

You need two active terminal windows:

### Terminal 1: Core FastAPI Backend
```bash
cd backend
pip install -r requirements.txt
python run.py
```
*FastAPI starts at `http://localhost:8000` with interactive docs at `http://localhost:8000/docs`.*

### Terminal 2: Recycler Dashboard Frontend
```bash
cd recycler-dashboard-frontend
npm install
npm run dev
```
*Vite dev server starts at `http://localhost:5174` (and binds to `0.0.0.0` for local network access).*

---

## 4. Default Recycler Accounts

Login using any pre-seeded authorized recycler account:

| Company Name | Email | Password | Primary Materials | Location |
| :--- | :--- | :--- | :--- | :--- |
| **GreenCycle Recycling Corp** | `greencycle@recycler.com` | `password123` | PCB (₹520), Battery (₹110), Cable (₹380) | Okhla Phase 1, Delhi |
| **EcoRecover Technologies** | `ecorecover@recycler.com` | `password123` | PCB, CRT, LCD, Motor/Magnet, Mixed Plastic | Sector 58, Noida |
| **CleanEarth Recycling** | `cleanearth@recycler.com` | `password123` | PCB, LCD, Mixed Plastic | Naraina, Delhi |

---

## 5. Portal Modules & Key Features

### A. Incoming Lots (`/`)
- Real-time stream of aggregated scrap lots assigned to your facility by certified dealers.
- Filters by `All`, `Pending Handover`, or `Completed`.
- Displays Lot UUID, Origin Dealer, Material Category, and Declared Weight.
- One-tap **"Verify & Confirm"** action.

### B. Confirm Handover & Dual-Weighing (`/confirm`)
- Enter or scan the Dealer QR Code (containing the authoritative Lot UUID).
- Input the certified weighbridge weight.
- **Real-Time Discrepancy Engine**:
  - Automatically calculates weight difference percentage:
    $$\text{Discrepancy} = \frac{\text{Verified Weight} - \text{Declared Weight}}{\text{Declared Weight}} \times 100$$
  - Discrepancies within 5% are considered normal moisture/tare tolerance.
  - Discrepancies $> 30\%$ trigger an immediate amber warning flag.
- Atomic settlement confirmation with instant payout calculation.

### C. Traceability & EPR Audit Records (`/audit`)
- Comprehensive audit table of all completed and disputed transactions.
- Highlights: Txn ID, Handover Timestamp, Category, Declared vs Verified Weights, Discrepancy %, and Settled Payout.
- **1-Click PDF Certificate Download**: Invokes `GET /api/transactions/{id}/pdf` to generate and download a cryptographic ReportLab compliance certificate.

### D. Recycler Profile & Buying Rates (`/profile`)
- Manage operational parameters: company name, physical address, service radius (km), and pickup availability.
- Set facility buying rates (₹/kg) across all 7 canonical e-waste streams.
