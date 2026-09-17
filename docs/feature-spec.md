# Feature Specification

## Mobile Application

### Authentication

- Dealer login
- Collector/Lite access where required
- Session handling
- Logout

---

## Dealer Home

- Stock summary
- Pending sync count
- Quick actions
- Recent activity

---

## Log Purchase

Required:

- Category
- Weight
- Price
- Timestamp
- UUID

Optional:

- Photo
- Collector reference

Requirements:

- Validation
- Local persistence
- Offline operation
- Sync state
- Duplicate prevention

---

## My Stock

- Group by category
- Show available quantity
- Exclude sold material
- Show empty state
- Open purchase details

---

## Create Lot

- Select available material
- One category per lot
- Calculate declared weight
- Create Lot UUID
- Move selected material to pooled/lot state

---

## Find Recycler

- Filter accepted material
- Show recycler rate
- Show distance
- Show pickup availability
- Rank recommendations
- Allow manual selection

---

## QR Handover

- Generate QR
- QR contains Lot UUID only
- Show category
- Show declared weight
- Manual fallback code

---

# Recycler Dashboard

## Profile

- Accepted materials
- Rates
- Pickup availability
- Service radius

## Incoming Lots

- Pending lots
- Lot details
- Dealer
- Category
- Declared weight

## Lookup

- QR scan
- Manual code

## Verification

- Declared weight
- Verified weight
- Discrepancy percentage
- Warning if >30%

## Confirmation

- Confirm Handover
- Backend validation
- Duplicate rejection

## History

- Completed transactions
- Declared/verified weights

## Record

- Generate/view platform verified transaction record

---

# ML

- Camera/photo input
- On-device inference
- Prediction
- Confidence
- High-confidence suggestion
- Collector correction
- Low-confidence manual selection

---

# Backend

- Authentication
- Users
- Purchases
- Stock
- Lots
- Recyclers
- Matching
- QR lookup
- Handover
- Transactions
- Sync
- Idempotency

---

# Cross-Cutting Requirements

- Consistent categories
- Consistent UUIDs
- Consistent statuses
- Error handling
- Loading states
- Empty states
- Offline handling
- Duplicate prevention
- Authorization