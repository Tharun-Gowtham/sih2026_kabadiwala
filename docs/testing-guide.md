# Testing Guide

## Testing Levels

1. Feature testing
2. Integration testing
3. End-to-end testing
4. Offline testing
5. Demo testing

---

# Dealer Tests

## Purchase

Test:

- Valid purchase
- Missing category
- Zero weight
- Negative weight
- Invalid price
- Offline purchase

---

# Stock

Test:

- Purchase increases stock.
- Lot creation reduces available stock.
- Sold lot does not remain available.

---

# Lot

Test:

- Single category.
- Correct total weight.
- Correct UUID.
- Cannot use unavailable stock.

---

# Recycler Matching

Test:

- Accepted category.
- Unsupported category.
- Rate.
- Distance.
- Pickup availability.

---

# QR

Test:

- Valid QR.
- Invalid QR.
- Unknown UUID.
- Manual fallback.
- QR does not directly confirm.

---

# Verification

Test:

Declared = 30 kg
Verified = 28 kg

No >30% warning.

Test:

Declared = 30 kg
Verified = 20 kg

Warning appears.

Confirmation remains possible.

---

# Duplicate Confirmation

First request:

SUCCESS

Second:

REJECTED

---

# Offline

Test:

1. Enable airplane mode.
2. Log purchase.
3. Close application.
4. Reopen.
5. Verify purchase remains.
6. Restore network.
7. Sync.
8. Verify server has one record.

---

# End-to-End

Collector:

Photo → ML → Confirm

Dealer:

Purchase → Stock → Lot → Recycler → QR

Recycler:

Scan → Verify → Confirm

Backend:

Transaction → Completed

Dealer:

Ledger updated

System:

Verified record generated