# Development Guide

## Before Writing Code

Every developer must first read:

1. product-overview.md
2. user-roles.md
3. feature-spec.md
4. data-contract.md
5. api-contract.md

Then read the feature-specific document.

---

# Before Creating a Feature

Ask:

1. Which user owns this feature?
2. Which data does it create?
3. Which API does it use?
4. Which other feature consumes that data?
5. What happens offline?
6. What happens if the request fails?
7. What happens if the user repeats the action?
8. What happens with invalid data?

---

# Agent Instructions

When using a coding agent:

Do NOT tell the agent:

"Build the whole application."

Instead provide:

- Feature
- Existing architecture
- Relevant specification
- API contract
- Expected behavior
- Acceptance criteria

Example:

"Implement Dealer Log Purchase according to feature-spec.md and
offline-sync.md. Do not modify the Recycler dashboard. Use the exact
category values from data-contract.md."

---

# Small PR Principle

One PR should preferably represent one coherent feature.

Good:

feature/log-purchase

Bad:

feature/everything

---

# Definition of Done

A feature is not done merely because:

- UI exists
- Code compiles
- Happy path works

A feature is done when:

- Normal case works.
- Validation works.
- Error state works.
- API contract matches.
- Data persists correctly.
- Integration works.
- Reviewer has tested it.