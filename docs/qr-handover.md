# QR Handover Specification

## Purpose

QR connects a physical lot with its digital record.

---

# QR Payload

The QR contains ONLY:

Lot UUID

Example:

`7f4e8c12-...`

---

# QR Must NOT Contain

- Dealer name
- Recycler name
- Price
- Weight
- Personal information
- Full transaction object
- Authentication credentials

---

# Lookup Flow

Dealer creates lot.

↓

Backend creates Lot UUID.

↓

Dealer displays QR.

↓

Recycler scans QR.

↓

Application extracts Lot UUID.

↓

Backend:

GET /lots/{lot_uuid}

↓

Backend returns authoritative lot.

---

# Why Only UUID?

The backend remains the source of truth.

If the weight changes or the lot status changes, the QR itself does not
become stale because it only identifies the lot.

---

# Manual Fallback

If scanning fails:

Recycler can enter:

Manual Lot Code

Backend performs the same lookup.

---

# QR Does Not Confirm

Scanning:

DOES NOT equal confirmation.

The sequence is:

Scan
→ Lookup
→ Inspect
→ Verify Weight
→ Confirm

---

# Security Principle

The QR is an identifier, not an authorization mechanism.

The backend must still verify:

- User
- Recycler
- Lot
- Assignment
- Status