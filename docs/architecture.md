# System Architecture

## High-Level Architecture

                    ┌───────────────────┐
                    │ Collector Lite    │
                    │ Mobile            │
                    │                   │
                    │ Camera            │
                    │ ML Classifier     │
                    └─────────┬─────────┘
                              │
                              ↓
                    ┌───────────────────┐
                    │ Dealer Mobile App │
                    │                   │
                    │ Purchase          │
                    │ Stock             │
                    │ Lots              │
                    │ Matching          │
                    │ QR                │
                    │ Ledger            │
                    └─────────┬─────────┘
                              │
                              ↓
                    ┌───────────────────┐
                    │ Backend API       │
                    │                   │
                    │ Auth              │
                    │ Database          │
                    │ Sync              │
                    │ Lots              │
                    │ Matching          │
                    │ Confirmation      │
                    └─────────┬─────────┘
                              │
                              ↓
                    ┌───────────────────┐
                    │ Recycler Web      │
                    │ Dashboard         │
                    │                   │
                    │ Profile           │
                    │ Incoming Lots     │
                    │ Verification      │
                    │ Confirmation      │
                    │ History           │
                    └───────────────────┘

---

# Layers

## Presentation

- Mobile UI
- Recycler dashboard

## Application

- Purchase workflow
- Stock workflow
- Lot workflow
- Matching
- Verification

## Backend

- Authentication
- Authorization
- Business rules
- Persistence
- Synchronization

## Database

Stores authoritative entities.

---

# Source of Truth

Backend is authoritative for:

- Lot state
- Recycler assignment
- Confirmation
- Transaction status
- Duplicate prevention

Local mobile database is authoritative only for local offline state until
synchronization succeeds.

---

# Critical Rule

Frontend validation improves UX.

Backend validation protects data integrity.

Both are required.