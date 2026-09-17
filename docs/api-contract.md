# API Contract

This document defines the shared interface between Mobile, Backend and
Recycler Dashboard.

The exact implementation technology may change, but field names and
semantics must remain consistent.

---

# Common Identifiers

All major entities require stable IDs.

Examples:

user_id
purchase_id
lot_id
recycler_id
transaction_id

UUIDs are preferred.

---

# Purchase

Example conceptual object:

{
  "purchase_id": "uuid",
  "dealer_id": "uuid",
  "category": "PCB",
  "weight": 10,
  "price": 450,
  "created_at": "...",
  "sync_status": "PENDING_SYNC"
}

---

# Lot

{
  "lot_id": "uuid",
  "dealer_id": "uuid",
  "category": "PCB",
  "declared_weight": 30,
  "recycler_id": "uuid",
  "status": "PENDING_HANDOVER"
}

---

# Handover

{
  "lot_id": "uuid",
  "declared_weight": 30,
  "verified_weight": 28,
  "discrepancy_percentage": 6.67
}

---

# Confirmation

Confirmation must identify:

- Lot
- Recycler
- Verified weight
- Request identity/idempotency information

---

# Categories

Only:

PCB
CRT
LCD
Cable
Battery
Motor/Magnet
Mixed Plastic

---

# Important Field Semantics

`declared_weight`

The weight recorded by Dealer.

`verified_weight`

The physical weight measured by Recycler.

Never use one field for both.

---

# QR

QR payload:

Lot UUID only.

---

# Statuses

The team must agree on exact status strings before implementation.

Example conceptual states:

AVAILABLE
POOLED
PENDING_HANDOVER
COMPLETED

Do not create alternate spellings in different modules.

---

# Contract Rule

If a developer wants to change a shared field:

1. Discuss with Backend Lead.
2. Update this document.
3. Update affected modules.
4. Test integrations.
5. Reviewer approves the change.

Do not silently rename shared fields.