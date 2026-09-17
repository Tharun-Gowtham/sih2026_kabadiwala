# Five-Day Implementation Plan

## Team

### Person A
Mobile Dev 1

Owns:

- Dealer Login
- Home
- Log Purchase
- My Stock

### Person B
Mobile Dev 2

Owns:

- Create Lot
- Find Recycler
- QR Handover
- Ledger
- Collector Lite

### Person C
Backend Lead

Owns:

- Database
- Authentication
- APIs
- Offline synchronization
- Idempotency
- Matching
- Confirmation
- Transaction records

### Person D
Dashboard Developer

Owns:

- Recycler profile
- Rates
- Incoming lots
- QR lookup
- Weight verification
- Confirmation
- History
- Verified record

### Person E
ML/Data Owner

Owns:

- Dataset
- Classifier
- TFLite export
- Labels
- Confidence
- ML integration support

### Person F
PR Reviewer + Integration/QA Lead

Owns:

- PR review
- Contract compliance
- Integration testing
- Bug tracking
- QA
- Final demo validation

---

# Day 1

Focus:

Architecture + core implementation.

A:

Dealer Login
Home
Log Purchase

B:

Create Lot structure
Collector Lite structure

C:

Database
Authentication
Core APIs

D:

Recycler Login/Profile

E:

Model preparation/export

F:

Review architecture
Finalize contracts
Prepare integration checklist

---

# Day 2

A:

Log Purchase
My Stock

B:

Create Lot
Collector ML integration

C:

Purchase API
Stock API
Lot API

D:

Incoming Lots
Profile/Rates

E:

ML testing

F:

Review PRs
Check contract consistency

---

# Day 3

A:

Offline purchase
Stock polish

B:

Find Recycler
QR

C:

Sync
Matching
QR lookup

D:

Weight verification
Confirmation

E:

ML corrections

F:

Integration testing

---

# Day 4

Focus:

End-to-end integration.

Test:

Purchase
→ Stock
→ Lot
→ Recycler
→ QR
→ Verification
→ Confirmation

Also test:

- Offline
- Duplicate confirmation
- >30% discrepancy
- Invalid QR

---

# Day 5

Focus:

Bug fixing + demo.

Test complete real flow.

Prepare:

- Pitch deck
- Architecture explanation
- ML explanation
- Offline explanation
- Demo script

Never replace broken functionality with fake demo shortcuts.