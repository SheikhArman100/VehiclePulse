# Phase 8 — MongoDB Telemetry Storage Architecture & Indexing Strategy

## 1. Overview
High-volume vehicle telemetry represents a distinct database workload from transactional CRUD records (like vehicles and devices). Telemetry data is **append-mostly, timestamped, ordered, and generated continuously** across an entire fleet.

To handle high write throughput and performant temporal/geospatial queries, VehiclePulse leverages MongoDB's native **Time-Series Collections**.

---

## 2. Time-Series Collection Specification

```typescript
{
  timeseries: {
    timeField: "timestamp",
    metaField: "metadata",
    granularity: "seconds"
  }
}
```

### Why Seconds Granularity?
In VehiclePulse, vehicles typically emit telemetry points every `1 to 5 seconds`. Selecting `granularity: "seconds"` tells MongoDB's wiredTiger engine to bucket incoming measurements within single-minute intervals. This significantly reduces disk storage footprint through columnar compression and improves cache efficiency for scans.

---

## 3. Schema Design: Measurements vs. Metadata

MongoDB time-series architecture partitions data into **Measurements** and **Metadata**:

| Category | Fields | Rationale |
|---|---|---|
| **Time Field** | `timestamp` | Required by MongoDB time-series engine. Defines bucket intervals and timeline ordering. |
| **Metadata** | `metadata.vehicleId`<br>`metadata.deviceId`<br>`metadata.vin` | Stable identifier attributes that change infrequently. Buckets are grouped by distinct metadata combinations. |
| **Measurement Fields** | `location.coordinates` (`[lng, lat]`)<br>`speed`<br>`rpm`<br>`fuelLevelPercent`<br>`engineTemperatureCelsius`<br>`batteryVoltage`<br>`odometerKm`<br>`engineStatus`<br>`accelerationG` | The high-frequency sensory readings recorded at each timestamp interval. |

---

## 4. Indexing Strategy & Justifications

VehiclePulse defines two primary indexes on the `telemetries` time-series collection:

### Index 1: Compound Temporal Filter Index
```javascript
{ "metadata.vehicleId": 1, "timestamp": -1 }
```
* **Primary Query Pattern**: Retrieve recent telemetry history for a specific vehicle over a time range (`from` to `to`) sorted descending (most recent first).
* **Execution Advantage**: Supports an `INDEX SCAN` without in-memory sorting (`SORT_KEY_GENERATOR`), enabling rapid pagination for vehicle telemetry charts and dashboard breadcrumbs.

### Index 2: 2dsphere Geospatial Proximity Index
```javascript
{ "location": "2dsphere" }
```
* **Primary Query Pattern**: `$near` queries finding all vehicles or telemetry points within a radial radius (e.g., within 5,000 meters of a coordinate).
* **Execution Advantage**: Enables the dispatch operator or fleet manager to query "Which vehicles are closest to destination X?" using spherical geometry calculations on Earth's ellipsoid (WGS84).

---

## 5. Retention Policy & TTL Behavior
- **Current Development Policy**: No automated drop (`expireAfterSeconds` is omitted) to ensure local benchmark and verification datasets persist across sessions.
- **Production Retention Configuration**:
  For production deployment, an automated rolling window can be configured directly on the time-series definition:
  ```javascript
  db.createCollection("telemetries", {
    timeseries: { timeField: "timestamp", metaField: "metadata", granularity: "seconds" },
    expireAfterSeconds: 60 * 60 * 24 * 90 // 90-day retention
  });
  ```
  MongoDB's internal bucket reaper automatically deletes entire compressed buckets when all documents inside exceed the threshold, consuming zero write IOPS compared to document-level row deletes.

---

## 6. Real Aggregation Pipelines
The telemetry module incorporates representative aggregation pipelines:
- **`getVehicleHourlyStats`**:
  Aggregates raw telemetry stream into hourly buckets, computing `$avg: "$speed"`, `$max: "$speed"`, `$max: "$rpm"`, and total `$sum: 1` data points for fleet analytics and trip summarization.
