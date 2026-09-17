# Ledger and Transactions

## Transaction Lifecycle

Purchase
→ Stock
→ Lot
→ Pending Handover
→ Confirmed
→ Completed

---

# Purchase

Represents material acquired by the dealer.

Example:

PCB
10 kg
₹450/kg

---

# Stock

Available physical material.

A purchase contributes to stock.

---

# Lot

A group of available material prepared for a recycler.

One lot:

- Has one category.
- Has a declared weight.
- Has a Lot UUID.
- Can be associated with one recycler.

---

# Pending Lot

The dealer has prepared the lot but the recycler has not completed
verification/confirmation.

This should NOT count as confirmed sales earnings.

---

# Completed Transaction

After recycler confirmation:

Lot → COMPLETED

The transaction becomes part of the dealer's confirmed history.

---

# Ledger

The ledger should distinguish:

### Purchases

Money spent acquiring material.

### Completed Sales

Money earned from confirmed transactions.

### Pending

Not yet confirmed.

---

# Weight Fields

The transaction stores:

declared_weight

and

verified_weight

separately.

---

# Verified Transaction Record

After successful confirmation, generate a platform-side record.

It can contain:

- Transaction ID
- Lot ID
- Dealer
- Recycler
- Category
- Declared weight
- Verified weight
- Timestamp
- Relevant location

---

# EPR Terminology

The generated record is a platform traceability artifact.

It must not be represented as an official government EPR certificate unless
authorized official integration exists.