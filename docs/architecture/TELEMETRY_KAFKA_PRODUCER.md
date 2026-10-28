# Telemetry Kafka Producer & Delivery Semantics

## 1. Overview
The **Telemetry Service** acts as the ingestion gateway for connected vehicles, mobile OBD-II trackers, and simulators.

Upon receiving telemetry (either a single event or a high-throughput micro-batch), it executes a dual persistence/publishing operation:
1. **Time-Series Storage:** Persists points into MongoDB Time-Series collection for temporal and geospatial historical queries.
2. **Kafka Event Backbone:** Publishes validated canonical `TelemetryRawEvent` records to the partitioned `vehicle.telemetry.raw` topic.

---

## 2. Producer Configuration & Reliability Guarantees

The producer is configured in `backend/services/telemetry-service/src/app/kafka/telemetryProducer.ts` with the following parameters:

```typescript
const producer = kafka.producer({
  allowAutoTopicCreation: false,
  idempotent: true,        // Prevents broker-side duplicates on transient network retries
  maxInFlightRequests: 1,  // Enforces strict per-partition ordering during retries
  retry: {
    initialRetryTime: 100,
    retries: 5,
  },
});
```

### Partitioning & Ordering
- **Partition Key:** Every message is keyed with `validatedEvent.vehicleId`.
- **Order Guarantee:** All events for a given vehicle route to the same partition, preserving timestamp sequence at consumers.

### Headers Injected
Each message published carries standard metadata headers:
- `x-event-id`: UUID v4 of the event
- `x-event-type`: `telemetry.raw`
- `x-version`: `1.0.0`
- `x-source`: `telemetry-service`

---

## 3. Dual-Write Analysis & Failure Behavior

When an ingestion endpoint writes to both a database (MongoDB) and a message broker (Kafka), it encounters the **dual-write problem**:

### Failure Scenarios:

| Failure Mode | Behavior | Recovery / Mitigation |
|---|---|---|
| **Invalid Payload** | Request rejected with `400 Bad Request` prior to MongoDB write or Kafka publish. | No partial state created. |
| **MongoDB Down** | Request aborts immediately. Nothing written to Mongo, nothing sent to Kafka. | Client retries. |
| **Kafka Down / Unreachable** | MongoDB write succeeds, Kafka publish throws error. | Handled via exponential retry (5 retries). In extreme broker downtime, request returns 500. |

### Outbox Pattern Assessment
- For high-frequency IoT streaming (1,000+ to 25,000+ events/sec), maintaining a transactional outbox table in MongoDB introduces severe write amplification and lock contention.
- Because raw telemetry is an **append-only sensor stream** with subsequent updates arriving seconds later, eventual consistency and client-side retry buffers are standard.
- In Phase 20 (Transactional Commands & Alerts), the Transactional Outbox pattern is implemented where strict ACID business coordination is mandatory.

---

## 4. Verification & Testing Evidence

1. **Unit & Contract Validation (`producer.test.ts`)**:
   - Rejection of malformed coordinates, invalid UUIDs, or negative speeds without sending to Kafka.
   - Live Kafka consumer validation confirming partition key and header injection.
   - Partial batch handling (accepting valid events while collecting errors on invalid ones).
2. **End-to-End API Ingestion via Nginx**:
   - Verified via `POST http://localhost/api/telemetry/v1/telemetry`:
     ```json
     {
       "statusCode": 201,
       "success": true,
       "message": "Telemetry point recorded and published to Kafka successfully",
       "data": {
         "kafkaPublish": {
           "published": true,
           "topic": "vehicle.telemetry.raw",
           "partition": 0,
           "offset": "1"
         }
       }
     }
     ```
