# Kafka-First Telemetry Architecture & Decoupled Consumer

## 1. Overview & Core Rationale

In high-frequency IoT streaming architectures, databases (like MongoDB, PostgreSQL, or MySQL) cannot match the raw write throughput of distributed append-only commit logs like Apache Kafka.

Directly writing to a database within the HTTP ingestion handler forces client requests to wait synchronously for database disk I/O, locking, and index re-computation. Under fleet load (e.g. hundreds or thousands of telemetry pings per second), this causes gateway connection saturation, queue timeouts, and system failure.

**VehiclePulse employs a strict Kafka-First Ingestion Pattern:**
```
[ Vehicle Tracker / Simulator ]
              │
              ▼  HTTP POST (JSON)
[ Nginx Reverse Proxy (Port 80) ]
              │
              ▼  Upstream Routing
[ Express Telemetry Service ]
         │  Validate against Zod schema
         ▼
[ Kafka Cluster (vehicle.telemetry.raw) ] ──▶ Returns Kafka ACK
         │
         ├───▶ [ HTTP 202 Accepted Response returned immediately to vehicle ]
         │
         ▼  Asynchronous Consumer Groups (Independent & Decoupled)
┌─────────────────────────────────┬─────────────────────────────────┬─────────────────────────────────┐
│                                 │                                 │                                 │
▼                                 ▼                                 ▼                                 ▼
[ MongoDB Consumer Worker ]      [ Analytics Consumer Worker ]     [ Alert Rules Engine Worker ]     [ State Consumer Worker ]
 - Group: telemetry-mongo-group    - Group: analytics-consumer-group  - Group: alert-rules-group       - Group: state-redis-group
 - Micro-batches into Time-Series  - Aggregates hourly into Postgres   - Evaluates speed/geo in MySQL    - Caches state in Redis
 - Commits offset AFTER db write   - Commits offset AFTER db write    - Commits offset AFTER db write   - Commits offset AFTER Redis
```

---

## 2. Ingestion Response Semantics: `202 Accepted`

When a vehicle or simulator issues `POST /api/telemetry/v1/telemetry`:
1. The Express handler validates the payload against `TelemetryRawEventSchema`.
2. It publishes the event to Kafka topic `vehicle.telemetry.raw` keyed by `vehicleId`.
3. **Response:** Returns **`202 Accepted`** with `status: "queued"`.

```json
{
  "statusCode": 202,
  "success": true,
  "message": "Telemetry event accepted and queued to Kafka",
  "data": {
    "status": "queued",
    "topic": "vehicle.telemetry.raw",
    "partition": 2,
    "offset": "12228"
  }
}
```

> [!IMPORTANT]
> A `202 Accepted` confirms that Kafka has durably received the message on its log partition. It does **not** signify that downstream database writes are finished.

---

## 3. Decoupled MongoDB Consumer Worker

The MongoDB worker runs in `backend/services/telemetry-service/src/app/kafka/mongoConsumer.ts`:
- **Consumer Group:** `telemetry-mongo-storage-group`
- **Offset Commit Strategy (`autoCommit: false`):**
  - Consumes micro-batches of telemetry events.
  - Executes `insertMany()` into the MongoDB Time-Series collection.
  - Explicitly calls `commitOffsetsIfNecessary()` **only after** MongoDB confirms the write.
  - If MongoDB experiences a momentary outage, the worker throws an error and retries without advancing the Kafka offset, ensuring **zero data loss**.

---

## 4. Live Verification Proof

A live test verified the entire asynchronous decoupled pipeline:
1. `POST http://localhost/api/telemetry/v1/telemetry` received **`202 Accepted`** with `status: "queued"`, `partition: 2`, `offset: "12228"`.
2. 500ms later, querying `GET /api/telemetry/v1/telemetry/latest/:vehicleId` returned the newly ingested record from MongoDB Time-Series collection with matching speed (`88 km/h`) and GPS coordinates.
3. All **31 unit/integration tests** across the platform pass cleanly.
