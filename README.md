# VehiclePulse — Distributed Telemetry & Real-Time Event Streaming Platform

**VehiclePulse** is an enterprise-grade, high-throughput vehicle telematics and event streaming platform built with **Node.js, TypeScript, Apache Kafka (KRaft), MongoDB, PostgreSQL, MySQL, Redis, RabbitMQ, and Next.js 15**.

The platform demonstrates distributed systems engineering, decoupled event-driven architectures, idempotent stream processing, multi-datastore CQRS, disaster recovery chaos drills, high-throughput batching, and observability — **all runnable locally on 100% free and open-source infrastructure** with zero paid cloud dependencies.

---

## 1. High-Level Architecture & Topology

```text
                   +--------------------------------------------------------+
                   |           Edge Gateway / Reverse Proxy                 |
                   |               (Nginx Port 80)                          |
                   +--------------------------------------------------------+
                          |                 |                   |        |
         POST /telemetry  |  REST Queries   |  Live WebSocket   |        | UI Requests
         (6,050 evt/sec)  |                 |  (/ws Upgrade)    |        | (Next.js)
                          v                 v                   v        v
           +---------------------+   +-------------+    +-------------------+
           |  Telemetry Service  |   |  Analytics  |    |  Frontend Web UI  |
           |    (Express :4001)  |   |  & Alerts   |    |  (Next.js :3000)  |
           +---------------------+   +-------------+    +-------------------+
             |                 |
(Kafka-First |                 | (Oplog Change Stream)
 Ingestion)  v                 v
   +--------------------+  +----------------------+
   | Kafka KRaft Cluster|  | MongoDB Time-Series  |
   | vehicle.telemetry  |  |  (Raw GPS & Fleet)   |
   +--------------------+  +----------------------+
     |          |          |
     |          |          | (Kafka Consumer Groups)
     v          v          v
+----------+ +----------+ +---------------+
|PostgreSQL| |  MySQL   | |  Redis State  |
|Analytics | |  Alerts  | | (Pub/Sub &    |
| Service  | | Service  | |  GEO Queries) |
+----------+ +----------+ +---------------+
     ^                          |
     |                          v
     |                WebSocket Live Stream
     |
+-----------------------------------------+
| RabbitMQ Asynchronous Job & DLQ Worker  |
|   (Vehicle Commands & Edge Actuation)   |
+-----------------------------------------+
```

---

## 2. Core Service Responsibilities & Data Ownership

| Service / Component | Port | Primary Datastore | Key Responsibility & Ownership |
|---|---|---|---|
| **Nginx Reverse Proxy** | `80` | *None* | Unified local entry point, rate limiting (200r/s ingest, 50r/s API), security headers, WebSocket upgrades. |
| **Telemetry Service** | `4001` | **MongoDB 7.0 (rs0)** | Vehicle/device inventory, fast-path telemetry ingestion, Kafka publishing (`vehicle.telemetry.raw`), time-series queries. |
| **Analytics Service** | `4002` | **PostgreSQL 16** | Consumes telemetry, calculates hourly/daily vehicle rollups, tracks trips, materializes analytical summaries. |
| **Alert Service** | `4003` | **MySQL 8.4** | Rule evaluation engine (overspeeding, harsh braking, high temp), incident lifecycle (OPEN -> ACK -> RESOLVED). |
| **Command Worker** | *Background* | **RabbitMQ 3.13** | Decoupled asynchronous vehicle command execution, dead-letter exchanges (DLQ), exponential backoff retries. |
| **Redis Real-Time State** | `6379` | **Redis 7.4** | Latest vehicle telemetry snapshot, geospatial queries (`GEOADD`/`GEOSEARCH`), Pub/Sub channel for WebSockets. |
| **Frontend Web** | `3000` | *Client Browser* | Metronic-styled operational dashboards, dynamic OpenStreetMap fleet view, real-time gauges, incident triage. |
| **Observability Stack** | `9090` / `3001` | **Prometheus & Grafana**| Centralized scraping of microservice `/metrics`, W3C `traceparent` OpenTelemetry tracing, pre-provisioned dashboards. |

---

## 3. Key Technical Capabilities & Evidence

### 3.1 Performance & Micro-Batching (Phase 35 & 36)
- **Isolated Kafka Producer:** Peaked at **47,714 msg/sec** on 500-event batches with dynamic GZIP compression.
- **Bulk Batch Ingestion:** Added `POST /api/v1/telemetry/batch` enabling edge hardware to stream **6,050 events/sec** through Nginx.
- **Single-Event Optimization:** Raised single-event HTTP ingestion throughput by **+48.3% (513 -> 761 req/s)** and cut p99 latency from **128.8ms down to 50.7ms**.
- *Report:* [docs/benchmarks/OPTIMIZATION_REPORT.md](docs/benchmarks/OPTIMIZATION_REPORT.md).

### 3.2 Chaos Drills & Disaster Recovery (Phase 33)
- Tested 10 failure scenarios against live Docker containers with 10/10 PASS:
  1. Analytics consumer kill -> Kafka lag grew -> restarted and caught up in 1s.
  2. Alert Service kill -> MySQL consumer recovery.
  3. Redis hard restart -> graceful degradation and reconnect.
  4. RabbitMQ worker termination -> task queue buffering and recovery.
  5. Broker failure & consumer partition rebalancing.
  6. PostgreSQL pause/unpause.
  7. Duplicate event delivery -> idempotent upsert verified.
  8. Corrupt poison-pill payload -> dead-letter handling verified.
  9. WebSocket abrupt disconnect -> reconnect and snapshot recovery.
  10. Container crash -> volume persistence verified across all datastores.
- *Report:* [docs/reports/FAILURE_DRILLS_AND_RECOVERY_EVIDENCE.md](docs/reports/FAILURE_DRILLS_AND_RECOVERY_EVIDENCE.md).

### 3.3 Multi-Broker Kafka KRaft Lab (Phase 34)
- Verified a dedicated 3-node KRaft cluster (`docker-compose.kafka-cluster.yml`) with partition replication factor 3 and `min.insync.replicas: 2`.
- Validated hard broker kill (`docker stop kafka-1`), automatic leader re-election, in-sync replica (ISR) contraction to `[2, 3]`, and clean recovery upon restart.
- *Architecture Document:* [docs/architecture/MULTI_BROKER_KAFKA_LAB.md](docs/architecture/MULTI_BROKER_KAFKA_LAB.md).

### 3.4 Production-Style Docker & Edge Hardening (Phase 37)
- Multi-stage Docker builds across all backend microservices and Next.js standalone frontend.
- **Non-root execution** (`uid=1000(node) gid=1000(node)`) to eliminate container breakout risks.
- **`dumb-init` PID 1 signal forwarding** ensuring clean `SIGTERM` connection draining.
- **Nginx rate limiting and security headers** (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`).
- *Guide:* [docs/architecture/PRODUCTION_HARDENING_GUIDE.md](docs/architecture/PRODUCTION_HARDENING_GUIDE.md).

---

## 4. Local Quick Start & Reproduction

### Prerequisites
- **Node.js**: `v20.x` or `v22.x`+
- **Docker & Docker Compose**: Docker Desktop with Linux Engine running
- **RAM**: Minimum 8 GB free RAM (16 GB recommended)

### Step 1: Start Infrastructure & Microservices
```bash
# Start all core data stores and backend services via Docker
docker compose -f backend/docker-compose.yml up -d

# Check that all 11 core containers are running and healthy
docker compose -f backend/docker-compose.yml ps
```

*Optional: Start with observability (Prometheus & Grafana dashboards on :3001):*
```bash
docker compose -f backend/docker-compose.yml --profile full up -d
```

### Step 2: Run Prisma Database Migrations
```bash
# Deploy PostgreSQL Analytics migrations
npm --prefix backend --workspace=@vehicle-pulse/analytics-service exec prisma migrate deploy

# Deploy MySQL Alerts migrations
npm --prefix backend --workspace=@vehicle-pulse/alert-service exec prisma migrate deploy
```

### Step 3: Run the Vehicle Simulator
Simulate 10 realistic vehicles emitting driving telemetry through the Nginx reverse proxy:
```bash
npm --prefix backend --workspace=@vehicle-pulse/telemetry-generator run start -- \
  --vehicles 10 \
  --rate 2 \
  --duration 30 \
  --output http \
  --endpoint http://localhost:80/api/telemetry/v1/telemetry
```

### Step 4: Launch the Frontend Web Dashboard
In a separate terminal:
```bash
cd frontend/web
npm install
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** (or **[http://localhost:80](http://localhost:80)** via Nginx) to view:
- **Fleet Map (`/map`)**: Real-time vehicle location tracking via OpenStreetMap.
- **Vehicle Detail (`/vehicles/:id`)**: Live gauges for speed, battery, fuel, and command dispatch.
- **Alerts Triage (`/alerts`)**: Live incident tracking and acknowledge/resolve workflow.
- **Analytics (`/analytics`)**: Fleet rollups and trip statistics.
- **Kafka Topology (`/kafka`)**: Topic partitions, offsets, and consumer group lag.

---

## 5. Running Automated Verification & Benchmarks

All test harnesses are reproducible locally:

```bash
# 1. Run all Unit & Contract Tests
npm --prefix backend --workspace=@vehicle-pulse/event-contracts test
npm --prefix backend --workspace=@vehicle-pulse/telemetry-service exec node --test dist/tests/producer.test.js

# 2. Run Failure & Chaos Drills (10/10 automated scenarios)
npm --prefix backend --workspace=@vehicle-pulse/telemetry-generator exec tsx ../../scripts/drills/run-failure-drills.ts

# 3. Run Multi-Broker Kafka Cluster Lab
npm --prefix backend --workspace=@vehicle-pulse/telemetry-generator exec tsx ../../scripts/drills/run-kafka-cluster-lab.ts

# 4. Run HTTP Concurrency & Batch Ingestion Benchmark
npm --prefix backend --workspace=@vehicle-pulse/telemetry-generator exec tsx ../../scripts/benchmarks/http-benchmark.ts

# 5. Run Isolated Kafka Producer Throughput Benchmark
npm --prefix backend --workspace=@vehicle-pulse/telemetry-generator exec tsx ../../scripts/benchmarks/producer-benchmark.ts

# 6. Verify Architecture & Agent Workflow Integrity
node tools/verify-workflow.mjs
```

---

## 6. Architecture Decisions & Constraints Registry

- **Zero Paid Dependencies Policy:** Every library, map tile (OpenStreetMap Leaflet), database, broker, and monitoring tool is 100% free and runnable on localhost without API keys or credit cards.
- **At-Least-Once Delivery & Idempotent Processing:** Microservices use deterministic UUID event IDs (`eventId`) and compound natural keys (`vehicleId` + `timestamp` bucket) to guarantee duplicate suppression across network retries.
- **Explicit Offsets After Persistence:** Kafka consumers (`eachBatch`) only commit Kafka offsets *after* durable persistence in PostgreSQL, MongoDB, or MySQL, eliminating data loss during consumer crash.
- **Nginx Single Entry Point:** Direct frontend-to-database communication is strictly forbidden; all traffic flows through Nginx on port 80.
- **No Speculative Auth:** The system intentionally focuses on core data streaming, resilience, and operational engineering; no fake JWT stubs or speculative RBAC bloat.

---

## 7. Teardown & Clean Reset

To stop all containers and cleanly remove volumes:
```bash
docker compose -f backend/docker-compose.yml down -v
```
To restart cleanly from a blank state, re-run Step 1 and Step 2 above.
