# Kabadiwala Connect — Mobile Web Application

Mobile-first operational hub for Dealers and Field Collectors in the Kabadiwala Connect digital scrap traceability platform.

---

## Features

### Dealer Operational Suite
1. **Dealer Authentication**: JWT token-based login connected to `POST /api/auth/login`.
2. **Dealer Home Dashboard**: Real-time available stock metrics, pending sync alert, quick action shortcuts, recent activity.
3. **Log Purchase (Offline-First)**:
   - 7 Canonical Categories (`PCB`, `CRT`, `LCD`, `Cable`, `Battery`, `Motor/Magnet`, `Mixed Plastic`).
   - Strict weight validation (`weight > 0`).
   - Persistent `purchase_id` (UUID v4) stored locally in IndexedDB with status `PENDING_SYNC`.
   - Survives browser close, refresh, and offline sessions.
4. **Idempotent Synchronization**:
   - "Sync Now" button sending batched records to `POST /api/purchases/sync`.
   - Preserves original UUIDs to prevent duplicate server records.
5. **My Stock**:
   - Authoritative backend stock from `GET /api/stock`.
   - Available weight grouped by category.
6. **Create Lot**:
   - Enforces **Single Category per Lot** rule.
   - Validates declared quantity against available stock.
   - Calls backend `POST /api/lots` to pool stock.
7. **Find & Match Recyclers**:
   - Ranks recyclers using weighted formula: Distance (50%), Rate (30%), Pickup (20%).
   - One-click recycler selection via `POST /api/lots/{lotId}/assign-recycler`.
8. **QR Handover**:
   - Strictly encodes **ONLY the Lot UUID string** inside the QR code.
   - Displays category, declared weight, and 6-character manual fallback code below QR.
   - Live status tracker.
9. **Dealer Ledger**:
   - Distinguishes purchases (expenditures) from confirmed sales (earnings).
   - Enforces accounting rule: **Pending lots do not count as earned income**.

### Collector / Kabadiwala Lite
1. **Scrap Scanner**: Camera capture or gallery photo selection.
2. **On-Device ML Classifier**: Real-time inference across the 7 canonical classes.
3. **Confidence Scoring**: If confidence $\ge$ 70%, shows suggested category with 1-tap **Confirm** or **Change** options. If $< 70\%$, prompts manual selection.
4. **Material & Safety Guide**: Recycling tips, indicative market rates, and safety notes.

---

## Running Locally

### Development Server
```bash
cd mobile
npm run dev
```
The app will be accessible at `http://localhost:5173`.

### Production Build
```bash
cd mobile
npm run build
```
The static bundle will be built to `mobile/dist/`.
