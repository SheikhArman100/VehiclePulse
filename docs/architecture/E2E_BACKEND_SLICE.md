# First End-to-End Backend Slice Verification (Phase 12)

## 1. Overview & Objective
Phase 12 establishes and proves the smallest complete, working backend data pipeline in **VehiclePulse**:

```
[ Simulator (Stateful Physics) ]
              │  HTTP POST (JSON)
              ▼
[ Nginx Reverse Proxy (Port 80) ]
              │  Upstream Routing
              ▼
[ Telemetry Service (Express + TS) ]
         ┌────┴───────────────────────────┐
         ▼                                ▼
[ MongoDB Time-Series Collection ]  [ Kafka KRaft (vehicle.telemetry.raw) ]
                                          │
                                          ▼
                                    [ Consumer Group (Verifier) ]
```

---

## 2. Startup Order & Dependencies

To execute this end-to-end slice, services must start in the following order:

1. **Docker Infrastructure Stack:**
   ```bash
   docker compose -f backend/docker-compose.yml up -d mongodb kafka nginx
   ```
   - MongoDB initializes replica set / standalone storage.
   - Kafka KRaft boots on controller & broker listeners (`29092` internal, `9092` host).
   - Nginx boots on port `80` with dynamic upstream DNS resolution.

2. **Topic Provisioning:**
   ```bash
   npm run topics:create --workspace=@vehicle-pulse/kafka-admin
   ```
   - Confirms `vehicle.telemetry.raw` (3 partitions, keyed by `vehicleId`) exists.

3. **Telemetry Ingestion Microservice:**
   ```bash
   docker compose -f backend/docker-compose.yml up -d telemetry-service
   ```
   - Connects to MongoDB (`mongodb://mongodb:27017/vehiclepulse_telemetry`).
   - Connects idempotent Kafka producer to `kafka:29092`.
   - Listens on port `4001` (proxied by Nginx at `http://localhost/api/telemetry/`).

---

## 3. End-to-End Execution Script

A dedicated verification runner is provided in `backend/infrastructure/kafka/src/e2eSlice.ts`:

```bash
npm run test:e2e --workspace=@vehicle-pulse/kafka-admin
```

### Execution Flow:
1. **Consumer Group Join:** Subscribes a consumer with a unique timestamped group to `vehicle.telemetry.raw`.
2. **Physics Simulation:** Instantiates `StatefulVehicleModel` instances for 3 distinct vehicles.
3. **HTTP Dispatch via Gateway:** Dispatches simulated event frames through `http://localhost/api/telemetry/v1/telemetry`.
4. **Partition Verification:** Asserts that each message is hashed by `vehicleId` and lands across available partitions.
5. **Contract Assertion:** Validates that consumed events contain the complete canonical envelope (`eventId`, `eventType: "telemetry.raw"`, `data.speed`, `data.location`).

---

## 4. Live Verification Output Evidence

Running `npm run test:e2e --workspace=@vehicle-pulse/kafka-admin` produced the following verified result:

```json
{
  "eventsSent": 15,
  "eventsReceived": 15,
  "distinctVehicles": [
    "veh_e2e_1793188425800_1",
    "veh_e2e_1793188425800_2",
    "veh_e2e_1793188425800_3"
  ],
  "partitionsHit": [0, 1],
  "durationMs": 6862,
  "sampleEventId": "03bc59b0-23f6-4903-b412-b4d2e7473a11",
  "sampleVehicleId": "veh_e2e_1793188425800_1",
  "sampleSpeed": 0
}
```

- **All 15 target events** sent by the simulator through Nginx were received in real time by the consumer.
- **Total Test Suite:** All 30 tests across 4 packages pass (`npm test`).
