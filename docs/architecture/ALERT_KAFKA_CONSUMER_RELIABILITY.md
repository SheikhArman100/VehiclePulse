# Architecture Decision Record: Alert Kafka Consumer Reliability & Poison-Pill Resilience (Phase 19)

## 1. Overview
The `alert-service` consumes raw vehicle telemetry from Kafka topic `vehicle.telemetry.raw` independently of `analytics-service`. The consumer group `alert-service-group` evaluates incoming telemetry against configured safety and mechanical rules and persists lifecycle alerts to MySQL.

---

## 2. Core Reliability Guarantees

### 1. Consumer Group Independence
- **Group ID:** `alert-service-group`
- Alert processing and incident evaluation operate completely decoupled from `analytics-service` (`analytics-consumer-group`). A lag or restart in analytics has zero effect on safety-critical alert detection.

### 2. Poison-Pill Resilience (Dead-Letter / Skip Policy)
In high-throughput vehicle event streams, corrupt or schema-mismatched messages ("poison pills") can crash a naive consumer, causing Kafka to repeatedly deliver the bad batch in an infinite crash loop.
- **Malformed JSON:** Caught in an inner `try/catch` block. The non-JSON bytes are logged with key and offset, `poisonMessagesSkipped` metric increments, and the offset is resolved.
- **Schema Mismatches:** Validated via `TelemetryRawEventSchema.safeParse(raw)`. Invalid payloads (e.g., missing required fields, non-UUID event IDs) are logged with validation issue details, `poisonMessagesSkipped` metric increments, and offset is resolved.
- **Subsequent Messages:** Valid telemetry in the stream immediately resumes processing without partition stalling.

### 3. Safe & Durable Offset Commits
- Automatic commits are disabled (`autoCommit: false`, `eachBatchAutoResolve: false`).
- Offsets are acknowledged and committed to Kafka broker **only after** `evaluateAndPersistTelemetryAlerts` completes its MySQL ACID transaction.
- Transient database exceptions trigger a batch halt and retry without premature offset advancement.

### 4. Real-Time Observability Metrics
Consumer health and throughput are exposed via:
- Endpoint: `GET /api/alerts/v1/alerts/consumer/metrics`
- Tracked metrics:
  - `messagesProcessed`: Total count of valid telemetry events parsed and evaluated.
  - `alertsCreatedOrAppended`: Number of alerts created or cooldown events appended.
  - `poisonMessagesSkipped`: Count of unparseable or schema-violating poison messages gracefully skipped.
  - `processingErrors`: Transient database or processing errors triggering batch retries.
  - `lastHeartbeatTime`: Epoch timestamp of last successful consumer heartbeat.
  - `isRunning`: Boolean consumer worker health flag.

---

## 3. Verification & Test Evidence
- Test file: [`src/tests/kafkaConsumer.test.ts`](file:///E:/Projects%202026/VehiclePulse/backend/services/alert-service/src/tests/kafkaConsumer.test.ts)
- Test assertions:
  1. `should consume real-time speeding telemetry, persist MySQL Alert & Event, and update consumer metrics` (PASS)
  2. `should survive poison messages (malformed JSON and schema mismatches) without crashing or halting stream` (PASS)
- Total test suite status: 17/17 tests passing across all 4 suites in `alert-service`.
