# Offline-First Synchronization

## Goal

Dealer operations must continue when internet connectivity is unavailable.

The primary example is Log Purchase.

---

# Offline Purchase Flow

User enters:

Category = PCB
Weight = 10 kg
Price = ₹450/kg

↓

Generate UUID

↓

Save locally

↓

Status = PENDING_SYNC

↓

Show purchase in local UI

The user does not need internet to save the purchase.

---

# Reconnection

When network becomes available:

Local Pending Records
↓
Sync Now
↓
Backend
↓
Idempotency Check
↓
Create/Update
↓
SUCCESS
↓
Mark Local Record as SYNCED

---

# UUID

Every locally created record must have a unique identifier.

Example:

purchase_id = UUID

The UUID allows the backend to recognize retries.

---

# Duplicate Prevention

Suppose:

Request 1 reaches backend.

Backend creates purchase.

Network response is lost.

App retries the same purchase.

Backend sees the same UUID.

Backend must NOT create a second purchase.

Instead:

Return the existing result.

---

# App Restart

Offline data must survive:

- App close
- App restart
- Temporary network failure

Example:

Airplane Mode
→ Log Purchase
→ Close app
→ Reopen app
→ Purchase still exists
→ Internet returns
→ Sync
→ Purchase appears once on server

---

# Sync Status

Recommended states:

PENDING_SYNC
SYNCING
SYNCED
FAILED

The UI can show:

"3 purchases waiting to sync"

---

# Manual Sync

Provide:

Sync Now

The user should be able to explicitly trigger synchronization.

---

# Important Rule

Do not create a fake online/offline toggle merely for the demo.

The offline test must actually work.