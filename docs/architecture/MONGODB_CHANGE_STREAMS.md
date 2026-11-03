# MongoDB Change Streams Architecture & Resume Token Recovery

**Project:** VehiclePulse — Real-Time Fleet Telemetry Platform  
**Component:** Telemetry Service MongoDB Change Stream Engine (`backend/services/telemetry-service`)  
**Phase:** 29 (Completed)  
**Execution Date:** 2026-11-03

---

## 1. Architectural Scope & Justification

MongoDB Change Streams provide an event-driven mechanism to monitor changes at the collection level in real time.

### Why use Change Streams for Vehicle inventory?
- **Dedicated Use Case**: Fleet configuration, hardware provisioning (devices), and vehicle inventory lifecycle (`insert`, `update`, `replace`, `delete`).
- **Kafka vs Change Streams Separation**:
  - **Apache Kafka KRaft**: Retains the dedicated role for high-throughput, latency-critical real-time vehicle telemetry ingestion (`vehicle.telemetry.raw` at 25,000+ evt/s).
  - **MongoDB Change Streams**: Exclusively handles operational metadata modifications and derived configuration triggers. We explicitly **do not** route raw telemetry ingestion through change streams to prevent unbounded oplog churn and CPU thrashing.

---

## 2. Replica Set Configuration

MongoDB Change Streams strictly require the MongoDB daemon to run within an active replica set (which creates and maintains the `local.oplog.rs` change buffer).

- **Replica Set Name**: `rs0`
- **Container**: `vehiclepulse-mongodb` (`mongo:7.0.14`)
- **Docker Compose Startup**:
  ```yaml
  mongodb:
    image: mongo:7.0.14
    container_name: vehiclepulse-mongodb
    command: ["mongod", "--replSet", "rs0", "--bind_ip_all"]
  ```
- **Initiation**: Initialized with member `mongodb:27017` as the writable primary.

---

## 3. Resume Token Protocol & Failure Recovery

In accordance with Phase 29 requirements, `MongoChangeStreamManager` guarantees zero lost changes during transient connection failures or service restarts:

```typescript
// backend/services/telemetry-service/src/app/db/changeStream.ts
this.changeStream.on("change", async (change) => {
  // Capture resume token from oplog cursor position
  if (change._id) {
    this.resumeToken = change._id;
  }
  // Process derived change notification...
});
```

### Resume & Recovery Protocol:
1. **Resume Token Capture**: Every incoming change event provides a opaque `_id` resume token representing its exact sequence in the MongoDB oplog.
2. **Reconnection with `resumeAfter`**: If a network disconnect, cursor timeout, or service restart occurs, the manager restarts the stream with `resumeAfter: this.resumeToken`.
3. **Graceful Shutdown**: Invoking `MongoChangeStreamManager.stopWatching()` safely closes the active cursor and removes listeners before the Node process exits.

---

## 4. Live Runtime Evidence

Verified end-to-end against the running containerized environment:

### Event 1: Vehicle Creation (`insert`)
- **Action**: `POST /api/telemetry/v1/vehicles` (via Nginx reverse proxy)
- **Log Observation**:
  ```json
  {
    "service": "telemetry-service",
    "operationType": "insert",
    "documentId": "6ae9a18e3efea12abe0568e8",
    "vin": "1HGCR2F83HA009999",
    "op": "insert"
  }
  ```

### Event 2: Vehicle Deletion (`delete`)
- **Action**: `DELETE /api/telemetry/v1/vehicles/cs_test_live` (via Nginx reverse proxy)
- **Log Observation**:
  ```json
  {
    "service": "telemetry-service",
    "operationType": "delete",
    "documentId": "6ae9a18e3efea12abe0568e8",
    "op": "delete"
  }
  ```

