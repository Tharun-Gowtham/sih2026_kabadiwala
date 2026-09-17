# Milk-Run Neighborhood Aggregation Pooling

## Overview

Milk-Run Pooling is an automated logistics optimization feature that clusters nearby e-waste lots
from multiple dealers into geographically efficient pickup batches for recyclers. Instead of
individual one-to-one pickups, a recycler's van follows an optimized route through a neighborhood,
collecting from multiple dealers in a single trip — the classic "milk run" pattern.

## Architecture

### Geohash-Based Clustering

Every lot created with GPS coordinates (latitude/longitude) is tagged with a **geohash cell** —
a hierarchical spatial index that maps continuous geography into discrete grid cells.

- **Precision 6** (~1.2 km × 0.6 km) is the default — tunable via `GEOHASH_PRECISION`.
- Lots in the same geohash cell and material category are candidates for the same batch.

### Batch Formation Algorithm

The system groups unbatched lots by `(material_category, geohash_cell)` and forms a batch when
**either** condition is met:

1. **Weight Threshold**: Total declared weight in the group ≥ `BATCH_THRESHOLD_KG` (default: 20 kg).
2. **Starvation Fallback**: The oldest lot in the group has been waiting ≥ `BATCH_MAX_WAIT_HOURS`
   (default: 48 hours) — prevents low-density areas from being starved indefinitely.

### Nearest-Neighbor Route Ordering

When a batch is formed, stops are ordered using a greedy nearest-neighbor heuristic:

1. **Initial formation**: Route starts from the geographic centroid of all lot coordinates.
2. **After recycler accepts**: Route is re-ordered starting from the recycler's actual GPS
   location (from their profile or user record).

### State Machine

```
  Lot:  POOLED → PENDING_HANDOVER → COMPLETED
                                         ↑
  Batch: READY → ASSIGNED → DISPATCHED → COMPLETED
                    ↓
                  READY (on cancel)
```

| Batch Status | Lot Status | Description |
|:---|:---|:---|
| READY | POOLED | Batch formed, waiting for recycler to accept |
| ASSIGNED | PENDING_HANDOVER | Recycler accepted, lots assigned to recycler |
| DISPATCHED | PENDING_HANDOVER | Van departed, dealers notified via FCM |
| COMPLETED | COMPLETED | All lots physically verified and confirmed |

## Configuration

All constants are in `Settings` (via `app/core/config.py`):

| Setting | Default | Description |
|:---|:---|:---|
| `BATCH_THRESHOLD_KG` | 20.0 | Minimum kg to auto-form a batch |
| `BATCH_MAX_WAIT_HOURS` | 48 | Starvation fallback trigger (hours) |
| `GEOHASH_PRECISION` | 6 | Geohash cell precision (~1.2 km × 0.6 km) |
| `AUTO_BATCH_ON_LOT_CREATE` | true | Auto-trigger batch formation on lot creation |
| `BATCH_AVG_SPEED_KMH` | 30.0 | Average van speed for ETA calculations |

## API Endpoints

All endpoints are mounted under `/api/batches`.

### Batch Formation

| Method | Path | Auth | Description |
|:---|:---|:---|:---|
| POST | `/batches/form` | Any user | Trigger batch formation algorithm |

### Batch Queries

| Method | Path | Auth | Description |
|:---|:---|:---|:---|
| GET | `/batches` | Recycler | List all batches (filterable) |
| GET | `/batches/available` | Recycler | List READY batches for acceptance |
| GET | `/batches/my` | Recycler | List batches assigned to current recycler |
| GET | `/batches/{id}` | Any user | Full batch detail with lots and route |
| GET | `/batches/{id}/route` | Any user | Ordered route stops with distances |

### Batch Actions

| Method | Path | Auth | Description |
|:---|:---|:---|:---|
| POST | `/batches/{id}/accept` | Recycler | Claim a READY batch |
| POST | `/batches/{id}/dispatch` | Recycler | Dispatch van, compute ETAs, send FCM |
| POST | `/batches/{id}/cancel` | Recycler | Cancel assignment, revert lots to POOLED |

### Lot Creation (Updated)

`POST /api/lots` now accepts optional `latitude` and `longitude` fields. When provided:
1. A `geohash_cell` is computed and stored.
2. `batch_status` is set to `"unbatched"`.
3. If `AUTO_BATCH_ON_LOT_CREATE` is enabled, batch formation runs immediately.

### Handover (Updated)

`POST /api/handover/confirm/{lot_id}` — after confirming a lot, the system checks if all
sibling lots in the same batch are `COMPLETED`. If so, the batch auto-transitions to `COMPLETED`.

## Data Models

### Batch (ORM)

| Column | Type | Description |
|:---|:---|:---|
| batch_id | String(36) PK | UUID |
| material_category | String(50) | e.g., "PCB", "Cable" |
| geohash_cell | String(12) | Geohash cell identifier |
| centroid_lat/lon | Float | Geographic center of the batch |
| total_weight_kg | Float | Sum of declared weights |
| status | String(20) | FORMING / READY / ASSIGNED / DISPATCHED / COMPLETED |
| recycler_id | String(36) FK | Assigned recycler (nullable) |
| route_json | JSON | Ordered list of stop dicts |
| pickup_scheduled_at | DateTime | Estimated pickup time (set on dispatch) |

### BatchLot (Join Table)

| Column | Type | Description |
|:---|:---|:---|
| batch_id | String(36) PK/FK | → batches.batch_id |
| lot_id | String(36) PK/FK | → lots.lot_id |

### Lot (Updated)

New columns:

| Column | Type | Description |
|:---|:---|:---|
| latitude | Float | Dealer yard GPS latitude |
| longitude | Float | Dealer yard GPS longitude |
| geohash_cell | String(20) | Computed geohash for clustering |
| batch_status | String(20) | "unbatched" / "batched" / "dispatched" / null |

## FCM Notifications

When a batch is dispatched, the system sends `PICKUP_INCOMING_CALL` data messages to all
dealers in the route. In production, this triggers a full-screen "incoming call" UI on the
mobile app.

The FCM service is currently a **stub** that logs payloads. To enable real FCM:
1. Set `FIREBASE_CREDENTIALS_PATH` env var.
2. Store FCM tokens in the User model.
3. Uncomment the real implementation in `fcm_service.py`.

## Testing

```powershell
# Run all tests (22 existing + 13 batch tests)
python -m pytest tests/ -v

# Run only batch tests
python -m pytest tests/test_batches.py -v
```

Test coverage includes:
1. Geohash stamping on lot creation
2. Threshold-based batch formation (≥20 kg)
3. Below-threshold skip
4. Starvation fallback (48h timeout)
5. Recycler available batch listing
6. Recycler batch acceptance + route reordering
7. Role-based authorization (dealer cannot accept)
8. Dispatch with ETA estimates
9. Cancellation and state rollback
10. End-to-end lifecycle: Lot → Batch → Accept → Dispatch → Handover → Batch COMPLETED
11. Batch detail and route endpoint structure
12. My-batches endpoint for recycler
