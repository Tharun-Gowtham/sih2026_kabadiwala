# PR Review Guide

## Owner

Person F — PR Reviewer + Integration/QA Lead

---

# Purpose

Every significant feature should be reviewed before merging into main.

The goal is not merely to check whether the code compiles.

The reviewer checks whether the feature actually fits the complete system.

---

# PR Review Checklist

## 1. Specification

Ask:

- Does this feature implement the agreed requirement?
- Are required fields present?
- Are validations present?
- Are edge cases handled?

---

# 2. Shared Contracts

Check:

- Field names
- UUID format
- Category values
- Status values
- API endpoints
- Request/response structures

Example:

Contract says:

`category`

Code uses:

`materialType`

Request change.

---

# 3. Business Rules

Examples:

QR must contain only Lot UUID.

Declared and verified weights must remain separate.

>30% discrepancy warns but does not block confirmation.

Already completed lots cannot be confirmed again.

Backend must enforce duplicate prevention.

---

# 4. Integration

Check whether the feature works with other people's code.

Examples:

B creates a lot.

D must be able to retrieve that lot.

C must expose the required API.

A's purchase fields must match C's database/API.

E's ML output must match B's expected category labels.

---

# 5. Testing

Reviewer should test:

### Normal

Expected successful flow.

### Invalid

Missing category.

Invalid weight.

Invalid UUID.

### Edge Cases

Zero weight.

Very large weight.

No internet.

Duplicate request.

Unknown lot.

Wrong recycler.

Already completed lot.

---

# 6. Fake Demo Detection

Reject:

- Hard-coded successful transactions
- Fake QR lookup
- Fake confirmation
- Fake offline mode
- Fake ML prediction

The final demo should exercise the real implementation.

---

# 7. Review Process

Developer creates branch.

↓

Developer implements feature.

↓

Developer tests feature.

↓

Developer opens PR.

↓

Person F reviews.

↓

If issues:

Request Changes

↓

Developer fixes.

↓

Person F re-tests.

↓

Approve.

↓

Merge.

---

# F Should NOT

- Rewrite everyone's code unnecessarily.
- Implement every feature.
- Approve without testing.
- Ignore contract mismatches.
- Blindly resolve conflicts.
- Merge broken code just because the deadline is close.

---

# Final Integration Review

Before demo:

- Run complete flow.
- Test offline.
- Test duplicate confirmation.
- Test bad QR.
- Test wrong recycler.
- Test discrepancy warning.
- Test app restart.
- Test generated transaction record.