# Recycler Journey

## Flow

Login
→ Profile/Rates
→ Incoming Lots
→ QR/Manual Lookup
→ Lot Details
→ Physical Verification
→ Verified Weight
→ Discrepancy Check
→ Confirm Handover
→ Completed
→ Transaction History / Verified Record

---

## 1. Login

Recycler logs into the web dashboard.

---

## 2. Profile

Recycler configures:

- Accepted materials
- Rate per material
- Pickup availability
- Service radius

Categories:

- PCB
- CRT
- LCD
- Cable
- Battery
- Motor/Magnet
- Mixed Plastic

A recycler should only have a rate for a material they accept.

---

## 3. Incoming Lots

Example:

LOT-123456
PCB
30 kg declared
Dealer ABC
Pending Verification

The dashboard should distinguish:

- Pending
- Verified
- Completed

---

## 4. Lot Lookup

Two methods:

### QR

Scan QR.

### Manual

Enter fallback code.

Backend retrieves the authoritative lot.

---

## 5. Lot Details

Display:

- Lot ID
- Material
- Dealer
- Declared weight
- Assigned recycler
- Status

QR scanning does not confirm the lot.

---

## 6. Physical Verification

Recycler receives physical material.

Recycler checks:

- Material category
- Approximate quantity
- Physical condition/relevant information
- Actual weight

---

## 7. Verified Weight

Recycler enters physical measurement.

Example:

Declared = 30 kg
Verified = 28 kg

Both values remain stored separately.

---

## 8. Discrepancy

If:

abs(declared - verified) / declared * 100 > 30

show warning.

Example:

Declared = 30 kg
Verified = 20 kg

Difference = 33.3%

Warning:

"Weight discrepancy detected. Please review the weight."

The warning does not automatically block confirmation.

---

## 9. Confirm Handover

Recycler selects:

Confirm Handover

Backend validates:

- Lot exists
- Recycler owns/is assigned to the lot
- Lot is pending
- Verification data exists
- Lot has not already been confirmed

---

## 10. Duplicate Confirmation

First:

SUCCESS

Second:

REJECTED — already confirmed

The backend must enforce this.

---

## 11. Completion

After successful confirmation:

Lot → COMPLETED

It disappears from pending incoming lots.

The transaction appears in history.

Dealer sees the same completed state.

---

## 12. Transaction History

Example:

LOT-123456
PCB
Declared: 30 kg
Verified: 28 kg
Dealer: ABC
Status: Completed

---

## 13. Verified Record

A platform-side verified transaction record may contain:

- Lot ID
- Transaction reference
- Dealer
- Recycler
- Category
- Declared weight
- Verified weight
- Date/time
- Relevant location

Do not call this an official government EPR certificate unless authorized
official integration actually exists.