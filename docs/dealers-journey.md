# Dealer Journey

## Overview

The Dealer is the main operational user of Kabadiwala Connect.

Complete journey:

Collector
→ Dealer
→ Log Purchase
→ Offline Save/Sync
→ My Stock
→ Create Lot
→ Find Recycler
→ Select Recycler
→ Generate QR
→ Physical Handover
→ Recycler Verification
→ Confirmation
→ Completed Transaction
→ Ledger

---

# 1. Dealer Login

Dealer opens the mobile application.

After authentication, the Dealer reaches the Dealer Home screen.

---

# 2. Dealer Home

Home should provide:

- Current stock summary
- Pending synchronization count
- Quick action: Log Purchase
- Quick action: My Stock
- Quick action: Create Lot
- Quick action: Find Recycler
- Recent transactions

The interface should prioritize frequent operational actions.

---

# 3. Scrap Arrives

A collector brings scrap material to the dealer.

Example:

Material: PCB
Weight: 10 kg

The dealer records the purchase.

---

# 4. Log Purchase

Required information:

- Category
- Weight
- Price
- Timestamp
- Purchase UUID

Optional:

- Photo
- Collector reference

The Dealer must be able to edit the price before saving.

---

# 5. Offline Purchase

The Dealer may not have internet connectivity.

The application should:

1. Save the purchase locally.
2. Generate a UUID.
3. Mark it as pending sync.
4. Allow the dealer to continue working.

Example:

Purchase UUID:
`8c0f...`

Sync status:

`PENDING`

When connectivity returns:

Sync Now
→ Backend
→ Success
→ Mark SYNCED

---

# 6. My Stock

Stock should show currently available material.

Example:

PCB: 30 kg
LCD: 12 kg
Cable: 20 kg

Historical purchases should not be confused with available stock.

Stock represents material that has not yet been sold/completed.

---

# 7. Create Lot

The dealer selects available stock.

A lot must contain material from one category.

Example:

PCB purchase 1 = 10 kg
PCB purchase 2 = 8 kg
PCB purchase 3 = 12 kg

Available PCB:

30 kg

Dealer creates:

LOT-123456
PCB
30 kg

The selected material becomes pooled into the lot.

It must no longer be treated as independently available for another lot.

---

# 8. Find Recycler

The system recommends suitable recyclers.

The prototype ranking uses:

- Distance — 50%
- Rate — 30%
- Pickup availability — 20%

Example:

Recycler A
12 km
₹500/kg
Pickup available

Recycler B
25 km
₹540/kg
Pickup available

Recycler C
8 km
₹470/kg
Pickup unavailable

The recommendation assists the dealer.

The dealer makes the final selection.

---

# 9. Select Recycler

Example:

LOT-123456
PCB
30 kg

Selected Recycler:

GreenCycle Recycling

The backend associates the lot with the selected recycler.

---

# 10. Generate QR

The dealer generates a QR code.

CRITICAL RULE:

The QR payload contains ONLY the Lot UUID.

Example:

`lot_uuid = 8c0f...`

The QR must NOT contain:

- Dealer name
- Recycler name
- Weight
- Price
- Full transaction
- Personal information

Conceptually:

QR
↓
Lot UUID
↓
Backend lookup
↓
Authoritative lot information

The UI may display category and declared weight below the QR.

A manual fallback code should also be available.

---

# 11. Physical Handover

The dealer physically hands the material to the recycler.

The QR connects the physical shipment to the digital lot.

---

# 12. Recycler Lookup

Recycler:

Scan QR
OR
Enter manual code

Backend retrieves the lot.

Recycler sees:

- Lot ID
- Material
- Dealer
- Declared weight
- Assigned recycler
- Status

Scanning the QR does NOT confirm the transaction.

---

# 13. Declared vs Verified Weight

Two separate values must exist.

Dealer declared weight:

30 kg

Recycler verified weight:

28 kg

The system must preserve both.

Do NOT overwrite:

`declared_weight`

with:

`verified_weight`

---

# 14. Discrepancy

Calculate the difference.

Example:

Declared = 30 kg
Verified = 20 kg

Difference:

33.3%

If discrepancy >30%:

Show warning.

The warning does NOT automatically reject the transaction.

---

# 15. Confirm Handover

Recycler selects:

Confirm Handover

Backend checks:

- Lot exists.
- Recycler is authorized.
- Lot is in the correct state.
- Required verification information exists.
- Lot has not already been confirmed.

If valid:

Transaction becomes completed.

---

# 16. Duplicate Confirmation

First request:

SUCCESS

Second request:

REJECTED

Reason:

Lot already confirmed.

This must be enforced by the backend.

Disabling the button in the frontend is not enough.

---

# 17. Stock After Completion

Before sale:

PCB available = 30 kg

After completed lot:

PCB available = 0 kg

The sold material must not become available for another lot.

---

# 18. Ledger

The Dealer Ledger shows:

- Purchases
- Completed sales
- Material
- Declared weight
- Verified weight
- Recycler
- Transaction status
- Date/time

Pending lots must not be treated as confirmed earnings.

---

# 19. Verified Transaction Record

After confirmation, the platform can generate a verified transaction record.

Possible fields:

- Transaction ID
- Lot ID
- Dealer
- Recycler
- Material
- Declared weight
- Verified weight
- Date/time
- Relevant location
- Transaction information

This is a platform-side traceability record.

It is NOT automatically an official government EPR certificate.

---

# Complete Example

Collector brings 10 kg PCB.

Dealer records:

PCB
10 kg
₹450/kg

After multiple purchases:

Available PCB = 30 kg

Dealer creates:

LOT-123456
30 kg PCB

Dealer selects:

GreenCycle Recycling

QR contains:

Lot UUID only

Recycler scans QR.

Declared:

30 kg

Recycler verifies:

28 kg

Recycler confirms.

Backend:

LOT-123456 → COMPLETED

Then:

- Stock updates.
- Ledger updates.
- Transaction history updates.
- Verified transaction record can be generated.