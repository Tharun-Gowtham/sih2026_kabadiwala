# User Roles and Responsibilities

## 1. Collector

The collector is the upstream field participant.

### Responsibilities

- Collect scrap.
- Take a photograph.
- Receive an ML category suggestion.
- Confirm or correct the suggestion.
- View relevant material information.

### Does NOT

The collector does not:

- Create dealer stock.
- Create lots.
- Select recyclers.
- Confirm recycler handovers.
- Decide verified weight.

---

## 2. Dealer

The dealer is the main operational user.

### Responsibilities

- Record purchases.
- Maintain stock.
- Create lots.
- Select recyclers.
- Generate QR codes.
- Track transactions.
- View ledger.

### Important

The dealer's recorded purchase is authoritative for the dealer's purchase
record.

ML suggestions may be carried forward as context, but the dealer confirms
the actual purchase.

---

## 3. Recycler

The recycler is the downstream verification participant.

### Responsibilities

- Maintain accepted categories.
- Set rates.
- Set pickup availability.
- View incoming lots.
- Look up lots.
- Inspect physical material.
- Record verified weight.
- Confirm handover.
- View completed transactions.

### Important

The recycler cannot modify the dealer's original declared weight.

The recycler records a separate verified weight.

---

## 4. Backend

The backend is the system of record.

It is responsible for:

- Authentication
- Authorization
- Database persistence
- Synchronization
- Lot state
- Recycler matching
- QR lookup
- Confirmation
- Duplicate prevention
- Transaction creation

Critical business rules must be enforced here.

---

## 5. PR Reviewer / Integration Lead

Person F is primarily the project's:

**PR Reviewer + Integration/QA Lead**

F reviews other team members' changes before merging.

### F checks

- Feature matches specification.
- API fields match shared contracts.
- Shared statuses are consistent.
- No accidental breaking changes.
- No fake demo shortcuts.
- Error states exist.
- Feature works in realistic scenarios.
- Integration with other modules works.

F does not need to implement every feature.

The feature owner fixes problems identified during review.