# Product Overview

## Problem

The e-waste ecosystem contains multiple participants:

- Door-to-door collectors
- Scrap dealers
- Aggregators
- Recyclers

Information can become fragmented between these participants.

Important information such as:

- Material type
- Quantity
- Purchase information
- Dealer stock
- Lot information
- Recycler information
- Physical received weight
- Transaction status

may not remain connected throughout the lifecycle of the material.

## Proposed Solution

Kabadiwala Connect creates a digital chain of traceability.

Instead of treating every interaction as an isolated record, the platform
connects them using persistent identifiers.

Example:

Purchase
→ Stock Item
→ Lot
→ Recycler
→ Handover
→ Transaction

## Core Principle

The system records what each participant actually knows.

Collector:
"I identified this material as PCB."

Dealer:
"I purchased 30 kg of PCB."

Recycler:
"I physically received and verified 28 kg."

The system must preserve these values instead of silently replacing them.

## Why This Matters

The difference between declared and verified information is useful for:

- Traceability
- Reconciliation
- Discrepancy detection
- Operational transparency
- Transaction history

## Users

### Collector

Needs:

- Simple interface
- Photo-based identification
- Large buttons
- Simple terminology
- Manual correction
- Material information

### Dealer

Needs:

- Purchase recording
- Offline functionality
- Stock management
- Lot creation
- Recycler matching
- QR generation
- Ledger

### Recycler

Needs:

- Profile
- Accepted materials
- Rates
- Incoming lots
- QR/manual lookup
- Weight verification
- Confirmation
- Transaction history

## Platform

The backend acts as the authoritative source of transaction state.

The frontend should never be trusted to enforce critical business rules alone.