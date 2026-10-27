# VehiclePulse — AI-Executable Phase-by-Phase Project Plan

**Project:** VehiclePulse — Real-Time Vehicle Telemetry & Event Streaming Platform  
**Purpose:** Build a portfolio-grade, locally runnable distributed backend and separate frontend that demonstrates event streaming, data processing, reliability, observability, performance testing, and failure recovery.

## 1. Instructions for the AI workflow

Treat this document as the project source of truth.

### Execution rules
1. Execute phases **in numerical order**. Do not skip ahead unless a phase explicitly permits parallel work.
2. Work on **one phase at a time**. Do not implement the entire project in one response or one code-generation pass.
3. Before editing files, inspect the current repository, package files, Git status, Node/npm versions, Docker configuration, and existing documentation. Preserve working code.
4. At the start of each phase, report the phase number/name, objective, prerequisites, expected file changes, and acceptance criteria.
5. Implement the smallest complete solution that satisfies that phase. Do not add unrelated features or speculative abstractions.
6. Run relevant formatting, type checks, linting, unit/integration tests, and Docker health checks where available. Never claim a command passed unless it was actually run and its result inspected.
7. Fix regressions caused by the phase before declaring it complete. If blocked, report the exact error, known cause, and smallest next action. Do not silently skip requirements.
8. Update `docs/PHASE_STATUS.md` after every phase with status (`NOT_STARTED`, `IN_PROGRESS`, `BLOCKED`, `DONE`), changed files, commands/results, decisions, and remaining issues.
9. Keep READMEs, architecture diagrams, environment examples, and run instructions consistent with actual code.
10. Never hard-code secrets. Commit only safe `.env.example` placeholders. Ignore local `.env` files, database volumes containing sensitive data, generated secrets, build outputs, and `node_modules`.
11. Use maintainable TypeScript, Zod at input boundaries, Pino for structured logs, centralized error handling, thin controllers, service-layer business logic, and repositories for database access.
12. Avoid dependencies unless a phase needs them. Prefer maintained, free/open-source packages.
13. Never invent benchmark numbers, test results, service behavior, or completion status.
14. At the end of each phase, report what changed, important design decisions, exact commands run and results, acceptance status, and the next phase.
15. Do not start the next phase until the current phase meets acceptance criteria or the owner explicitly approves proceeding with a documented blocker.

### Mandatory constraints
- **Free-only:** every dependency, database, broker, registry, monitoring tool, API, and infrastructure component must be free/open-source or runnable locally without payment. No paid cloud, paid SaaS, paid APIs, credit cards, or usage credits.
- **Backend and frontend are separate applications/directories.**
- Backend: **Node.js + Express + TypeScript + npm workspaces**.
- Frontend: **Next.js + TypeScript**, with its own package setup.
- **Nginx is the reverse proxy in local development and production-style Docker. Use it from the beginning.**
- Do not build a custom Node.js reverse proxy.
- **No API Gateway.**
- **No authentication, user module, JWT, or RBAC** in this version. Do not add login/register screens or auth phases.
- Frontend communicates with backend only through HTTP REST and WebSocket. It must never connect directly to databases, Redis, Kafka, or RabbitMQ.
- Use Kafka for the telemetry event stream. Do not use per-event REST requests as the high-throughput ingestion mechanism.
- Use Docker Compose for local infrastructure. Do not require paid hosting.
- Do not commit generated Prisma clients, compiled output, secrets, or `node_modules`.
- Use npm commands, not yarn or pnpm.

## 2. Product scope and architecture

### Main workflow
1. A stateful local vehicle simulator generates realistic telemetry.
2. Telemetry Service validates data, stores required records in MongoDB, and publishes versioned events to Kafka.
3. Kafka consumers process telemetry independently:
   - Analytics Service writes analytical aggregates to PostgreSQL.
   - Alert Service evaluates rules and manages alerts/incidents in MySQL.
   - State consumer updates current vehicle state in Redis.
4. RabbitMQ handles asynchronous jobs and vehicle commands, including retries and dead-letter workflows.
5. Redis Pub/Sub distributes state updates to a WebSocket endpoint.
6. The separate Next.js dashboard receives REST data and live updates through Nginx.
7. Prometheus, Grafana, Pino, and OpenTelemetry provide observability.
8. Load tests, replay, duplicate-event tests, and failure drills demonstrate reliability and performance.

### High-level topology

```text
Vehicle Simulator
       |
       v
Telemetry Service ----> MongoDB
       |
       v
     Kafka
       |
       +----> Analytics Consumer ----> PostgreSQL
       |
       +----> Alert Consumer --------> MySQL
       |
       +----> State Consumer --------> Redis
                                      |       \
                                      |        +--> GEO / cache / rate limiting / locks
                                      v
                                 Redis Pub/Sub
                                      |
                                      v
                               WebSocket endpoint

Alert Service / workers <----> RabbitMQ (jobs, commands, retries, DLQ)

Next.js Frontend ---- HTTP REST + WebSocket ----> Nginx ----> backend services

Prometheus ---- scrapes service metrics ----> Grafana
OpenTelemetry instruments traces/metrics where configured
```

### Technology stack
- Backend: Node.js, Express, TypeScript, npm workspaces, Zod, Pino
- Data: MongoDB + Mongoose; PostgreSQL + Prisma; MySQL + Prisma
- Streaming/messaging: Apache Kafka + KafkaJS; RabbitMQ + amqplib
- State: Redis + ioredis
- Reverse proxy: Nginx
- Frontend: Next.js + TypeScript
- Live UI: WebSocket
- Map: Leaflet / React Leaflet / OpenStreetMap
- Observability: Prometheus, Grafana, OpenTelemetry
- Event contracts: JSON initially, then Protobuf and a free/self-hosted schema-registry option
- Load testing: k6 or Artillery, free/local use
- Runtime: Docker, Docker Compose
- Tests: free open-source tools suitable for the codebase

## 3. Repository layout target

```text
vehicle-pulse/
├── backend/
│   ├── services/
│   │   ├── telemetry-service/
│   │   ├── analytics-service/
│   │   └── alert-service/
│   ├── packages/
│   │   ├── config/
│   │   ├── logger/
│   │   ├── event-contracts/
│   │   └── shared/
│   ├── simulator/
│   │   └── telemetry-generator/
│   ├── workers/
│   │   └── command-worker/
│   ├── infrastructure/
│   │   ├── nginx/
│   │   ├── kafka/
│   │   ├── mongodb/
│   │   ├── postgres/
│   │   ├── mysql/
│   │   ├── redis/
│   │   ├── rabbitmq/
│   │   └── observability/
│   ├── docker-compose.yml
│   ├── package.json
│   └── README.md
├── frontend/
│   └── web/
│       ├── app/
│       ├── components/
│       ├── hooks/
│       ├── lib/
│       └── services/
├── docs/
│   ├── architecture/
│   ├── benchmarks/
│   ├── failure-drills/
│   └── PHASE_STATUS.md
├── .gitignore
└── README.md
```

Folder details may evolve if documented, but backend and frontend must remain separate. Backend npm workspaces must not include the frontend.

## 4. Definition of done for every phase

A phase is done only when:
- Its stated output exists and works.
- Acceptance criteria have been checked against the actual implementation.
- Applicable tests/type-checks/builds have been run and results reported.
- Existing completed functionality still works.
- Setup/configuration/documentation is updated.
- `docs/PHASE_STATUS.md` records evidence and status.
- No secret, paid service, auth subsystem, or unapproved technology was added.

---

# Phase 0 — Repository inspection and execution baseline

**Objective:** Understand the current workspace before making changes.

**Tasks**
- Inspect files, Git status, package files, Node/npm versions, Docker availability, and existing documentation.
- Identify existing work that must be preserved.
- Create a baseline report.
- Create `docs/PHASE_STATUS.md` with all phases listed and initially `NOT_STARTED`, except phases verified as complete.
- Do not overwrite a working repository with a generated scaffold.

**Acceptance criteria**
- Current repository and tools are documented.
- Existing code and user changes are preserved.
- No feature code is written before baseline inspection.

# Phase 1 — Repository and Git foundation

**Objective:** Establish separated backend and frontend roots.

**Tasks**
- Create/verify root README and `.gitignore`.
- Create `backend/` and `frontend/web/`.
- Initialize the backend npm workspace with `services/*`, `packages/*`, `simulator/*`, and `workers/*` as needed.
- Initialize the independent frontend Next.js TypeScript app.
- Add basic scripts and Node version guidance.
- Keep lockfiles in appropriate app roots; avoid conflicting package-manager setups.

**Acceptance criteria**
- Backend and frontend install dependencies independently.
- `npm install` works in each app root.
- Backend workspaces do not include frontend.
- Git ignores secrets, `node_modules`, build output, coverage, and local volumes.

# Phase 2 — Shared backend foundations

**Objective:** Standardize configuration, logging, errors, validation, and health checks.

**Tasks**
- Create a shared typed environment/config package using Zod.
- Create a Pino logger package.
- Add request ID/correlation ID middleware.
- Add centralized Express error handler and not-found handler.
- Add graceful shutdown patterns.
- Add `/health/live` and `/health/ready` endpoints to each service as it is created.
- Establish TypeScript strictness and shared conventions.

**Acceptance criteria**
- Invalid environment variables fail fast with clear messages.
- Errors return consistent JSON without exposing production stack traces.
- Logs include request/correlation identifiers where relevant.
- Type-check/build passes.

# Phase 3 — Event contracts and domain definitions

**Objective:** Define shared, validated telemetry/event contracts before broker integration.

**Tasks**
- Define event envelope: `eventId`, `eventType`, `version`, `vehicleId`, `deviceId`, `timestamp`, and `data`.
- Define Zod schemas and inferred TypeScript types.
- Define event naming, timestamp units, measurement units, versioning policy, and idempotency semantics.
- Define schemas for vehicle state, alert, and command events.
- Write examples and validation tests.

**Acceptance criteria**
- Valid examples parse successfully; invalid examples fail.
- Units and versioning are documented.
- Services import shared contracts rather than redefining event shapes.

# Phase 4 — Local Docker infrastructure baseline

**Objective:** Start free local infrastructure consistently.

**Tasks**
- Create Docker Compose configuration, named volumes, and health checks.
- Start with Nginx and the minimum dependencies needed for smoke testing; add MongoDB, Kafka, PostgreSQL, MySQL, Redis, and RabbitMQ incrementally.
- Pin compatible image versions rather than using `latest`.
- Use Docker service names for container networking.
- Provide safe `.env.example` files.
- Document infrastructure start/stop/status/log commands.
- Do not expose database/broker ports publicly by default; expose local development ports only when needed.

**Acceptance criteria**
- `docker compose config` succeeds.
- Core containers start and health checks pass.
- Expected data persists across restarts.
- No paid cloud service is required.
- Resource requirements and local-machine limitations are documented.

# Phase 5 — Nginx reverse proxy, local-first

**Objective:** Route local traffic through Nginx from the beginning.

**Tasks**
- Add an Nginx container and maintainable config under `backend/infrastructure/nginx/`.
- Route `/api/telemetry/` to Telemetry Service, `/api/analytics/` to Analytics Service, and `/api/alerts/` to Alert Service.
- Configure WebSocket upgrade headers and `/ws` routing to the eventual WebSocket endpoint.
- Preserve and document path-prefix semantics.
- Set sensible request-size and timeout limits.
- Keep internal services on Docker networks; frontend uses the Nginx base URL.
- Add a proxy smoke test and document local URLs.

**Acceptance criteria**
- Requests reach the intended service through Nginx.
- WebSocket proxy settings are ready and later tested against the real endpoint.
- Frontend need not call service ports directly.
- Nginx is used locally and in production-style Compose.
- This is a reverse proxy, not a custom API Gateway.

# Phase 6 — Telemetry Service skeleton

**Objective:** Create the first runnable Express microservice.

**Tasks**
- Set up `backend/services/telemetry-service`.
- Add app/server separation, routes, controllers, services, repository interfaces, middleware, config, logger, and tests.
- Add `/api/v1` versioning.
- Add health/readiness endpoints and graceful shutdown.
- Add a basic vehicle route placeholder.
- Wire it into Docker Compose and Nginx.

**Acceptance criteria**
- Service runs independently and in Docker.
- Health endpoint works directly and through Nginx.
- Tests and type-check pass.
- Business logic is not placed in controllers.

# Phase 7 — MongoDB integration and vehicle management

**Objective:** Persist vehicle and device configuration in MongoDB.

**Tasks**
- Configure Mongoose connection, lifecycle, and health reporting.
- Create vehicle and device schemas/models.
- Implement vehicle CRUD:
  - `POST /api/v1/vehicles`
  - `GET /api/v1/vehicles`
  - `GET /api/v1/vehicles/:id`
  - `PATCH /api/v1/vehicles/:id`
  - `DELETE /api/v1/vehicles/:id`
- Implement device create/list/get/update endpoints.
- Add pagination, filtering, Zod validation, unique identifiers, duplicate-key handling, and justified indexes.
- Test validation, missing records, duplicate identifiers, and database errors.

**Acceptance criteria**
- CRUD works through Nginx.
- Validation and pagination are consistent.
- Indexes and schema choices are documented.
- Normal and failure paths are tested.

# Phase 8 — Telemetry storage model

**Objective:** Design MongoDB storage for high-volume telemetry.

**Tasks**
- Use a MongoDB time-series collection where supported and appropriate.
- Define metadata and measurement fields.
- Add indexes for real query patterns, including 2dsphere where supported and useful; add TTL only when an explicit retention policy is intended.
- Implement writes, vehicle history, time-range queries, and location queries.
- Add representative aggregation pipelines and explain-plan checks.
- Document retention and time-series limitations.

**Acceptance criteria**
- Records can be stored and queried by vehicle/time.
- Geospatial query is tested if included.
- Index choices and retention behavior are documented.
- Queries use representative data.

# Phase 9 — Stateful vehicle telemetry simulator

**Objective:** Generate realistic, reproducible telemetry locally.

**Tasks**
- Create a CLI simulator under `backend/simulator/telemetry-generator`.
- Support vehicle count, event rate, duration, seed, and output mode.
- Generate stateful movement, plausible route/location changes, speed, stops, fuel consumption, temperature, voltage, RPM, acceleration, braking, and online/offline behavior.
- Ensure unique event IDs and consistent timestamps.
- Support low-rate smoke mode.
- Add tests and usage docs.

**Acceptance criteria**
- Seeded runs are reproducible where designed.
- Values obey documented ranges and state transitions are plausible.
- Event rate is measured, not assumed.
- No paid external API is needed.

# Phase 10 — Kafka local setup and topic strategy

**Objective:** Establish Kafka as the telemetry event backbone.

**Tasks**
- Configure a free local Kafka deployment compatible with Compose.
- Document broker mode/version.
- Create `vehicle.telemetry.raw`, `vehicle.telemetry.processed`, `vehicle.alerts`, `vehicle.state`, and `vehicle.commands` as needed.
- Configure local single-broker settings and clearly document lack of high availability.
- Use `vehicleId` as telemetry partition key.
- Add commands/scripts to inspect topics and consumer groups.

**Acceptance criteria**
- Kafka starts and topics can be inspected.
- Test producer/consumer exchange events.
- Partition-key and ordering expectations are documented.
- Local limitations are explicit.

# Phase 11 — Telemetry Kafka producer

**Objective:** Publish validated telemetry reliably.

**Tasks**
- Implement KafkaJS producer infrastructure in Telemetry Service.
- Validate events using shared contracts.
- Publish to `vehicle.telemetry.raw`, keyed by `vehicleId`.
- Configure retries, delivery timeout, batching, compression, and idempotent behavior where supported by the selected client/broker settings.
- Do not claim end-to-end exactly-once delivery.
- Define failure behavior when MongoDB succeeds but Kafka publishing fails; document whether an outbox is required.
- Add metrics and tests for success, invalid payloads, broker outage, and retries.

**Acceptance criteria**
- Valid events reach Kafka; invalid events are rejected.
- Broker failure is visible and has a defined retry/error path.
- Delivery guarantees and dual-write risk are documented.

# Phase 12 — First end-to-end backend slice

**Objective:** Prove the smallest full workflow.

**Tasks**
- Run simulator → Telemetry Service → Kafka → test consumer.
- Add an integration smoke test or repeatable script.
- Verify event schema, partition key, event IDs, and logs.
- Route HTTP ingestion through Nginx where applicable.
- Document startup order.

**Acceptance criteria**
- A small run produces countable Kafka events.
- Event fields and partition keys are verified.
- The workflow is repeatable using documented commands.

# Phase 13 — Kafka benchmark harness

**Objective:** Measure producer throughput before optimizing.

**Tasks**
- Build a benchmark command with configurable event rate, vehicle count, duration, partitions, batching, compression, and concurrency.
- Try 1K, 5K, 10K, 25K events/sec and higher only as hardware allows.
- Record throughput, MB/s, latency percentiles where measurable, errors, CPU, RAM, and broker configuration.
- Save raw outputs and reports under `docs/benchmarks/`.
- Never invent or pre-fill results.

**Acceptance criteria**
- Runs are repeatable and report actual results.
- Hardware/configuration accompany each result.
- Limits and bottlenecks are explained.

# Phase 14 — Analytics Service foundation

**Objective:** Create the independent analytics microservice.

**Tasks**
- Create `backend/services/analytics-service` with Express, TypeScript, shared config/logger, health checks, errors, and tests.
- Configure PostgreSQL and Prisma.
- Add migrations and a simple health/query endpoint.
- Register an analytics Kafka consumer group.
- Add graceful shutdown.

**Acceptance criteria**
- Service starts independently.
- Database connection and migrations work.
- Readiness reflects dependency health.
- Consumer joins its group.

# Phase 15 — Analytics schema and aggregation consumer

**Objective:** Turn telemetry into analytics.

**Tasks**
- Create tables for hourly/daily vehicle statistics, trip, speed, and fuel statistics where justified.
- Consume `vehicle.telemetry.raw` in the analytics group.
- Aggregate into PostgreSQL using transactions/batches.
- Implement replay-safe processing with a processed-event record or another documented strategy.
- Commit offsets only after durable processing.
- Test duplicate events, partial failures, and restarts.
- Add summary, history, trip, and time-range APIs.

**Acceptance criteria**
- Events update analytical data.
- Duplicate delivery does not double-count.
- Offsets are not committed before durable work.
- API results match fixture data.

# Phase 16 — PostgreSQL query engineering

**Objective:** Demonstrate measurable SQL/query optimization.

**Tasks**
- Add appropriate B-tree/composite/partial/covering indexes, BRIN where suitable, partitioning when justified, JSONB when useful, CTEs, and window functions.
- Add materialized views only for demonstrated query needs.
- Capture `EXPLAIN ANALYZE` for representative queries before/after optimization.
- Keep Prisma for standard operations and use parameterized raw SQL for advanced queries.
- Document migration/query decisions.

**Acceptance criteria**
- At least two representative query plans are documented before/after changes.
- Performance claims are measured.
- Index/partition choices have a workload rationale.

# Phase 17 — Alert Service foundation and MySQL

**Objective:** Implement transactional alert and incident management.

**Tasks**
- Create `backend/services/alert-service` with Express, TypeScript, config/logger, health checks, and tests.
- Configure MySQL and Prisma migrations.
- Create `alert_rules`, `alerts`, `alert_events`, and `incidents`.
- Model lifecycle `OPEN → ACKNOWLEDGED → RESOLVED`.
- Add APIs to list/filter alerts, retrieve details, acknowledge, and resolve.
- Use transactions, appropriate indexes, optimistic locking where useful, and safe deadlock retries.

**Acceptance criteria**
- Migrations and APIs work.
- Invalid lifecycle transitions are rejected.
- Concurrent updates do not silently overwrite each other.
- Transaction/error paths are tested.

# Phase 18 — Alert rules engine

**Objective:** Evaluate telemetry with configurable, testable rules.

**Tasks**
- Keep rules outside controllers, with clear inputs/outputs.
- Add rules: speed > 120 km/h, engine temperature > 110, battery voltage < 11.5, harsh braking, extreme acceleration, and vehicle offline.
- Make thresholds configurable and validated.
- Deduplicate repeated alerts using stable rule/vehicle/time-window keys.
- Persist alert events and update lifecycle safely.
- Test boundaries, missing readings, duplicates, and configuration.

**Acceptance criteria**
- Rules have tests and documented units.
- Repeated telemetry does not create unbounded duplicate alerts.
- Rule logic is independent of transport and persistence.

# Phase 19 — Alert Kafka consumer reliability

**Objective:** Process alerts independently and safely.

**Tasks**
- Consume telemetry with a dedicated consumer group.
- Persist outcomes, then commit offsets.
- Add transient retries and a poison-message policy.
- Ensure duplicate delivery is safe.
- Add lag and processing metrics.
- Test service downtime and recovery.

**Acceptance criteria**
- Alert processing works independently of analytics.
- Duplicate events are harmless.
- Restart/failure tests prove offsets are not committed prematurely.
- Poison-event behavior is documented.

# Phase 20 — RabbitMQ jobs and commands

**Objective:** Use RabbitMQ for async jobs, not telemetry streaming.

**Tasks**
- Add RabbitMQ, exchanges, queues, bindings, and durable settings.
- Use exchanges such as `alert.exchange`, `notification.exchange`, and `vehicle.command.exchange`.
- Add notification jobs, diagnostics, and simulated vehicle commands.
- Implement publisher confirms, manual ACK, prefetch, competing consumers, bounded retries, and DLQ.
- Use a retry chain such as 5s → 30s → 5m → DLQ if supported by the chosen design.
- Add correlation IDs and idempotency keys.
- Build a command worker and simulated device response path.

**Acceptance criteria**
- Jobs ACK only after successful processing.
- Transient failures retry according to policy.
- Poison messages reach the DLQ.
- Publisher/consumer failures are tested.

# Phase 21 — Redis real-time state

**Objective:** Maintain fast current vehicle state.

**Tasks**
- Add Redis and ioredis lifecycle/reconnection.
- Update per-vehicle state from Kafka using keys such as `vehicle:{vehicleId}:state`.
- Add timestamps, TTL/staleness behavior, and stale-update protection.
- Use atomic updates where needed.
- Expose current state and online/offline status through a clearly owned API.
- Test out-of-order events and Redis outage behavior.

**Acceptance criteria**
- Latest state is retrievable quickly.
- Older events cannot overwrite newer state where prevented by the design.
- Stale/offline behavior is predictable and tested.

# Phase 22 — Redis caching and GEO

**Objective:** Add practical cache and geospatial features.

**Tasks**
- Implement cache-aside for selected read-heavy metadata/analytics where beneficial.
- Define TTL and invalidation.
- Add GEOADD/GEOSEARCH for nearby vehicles if supported.
- Add nearby-search API.
- Measure cache hit/miss ratio and compare query paths.
- Do not cache everything by default.

**Acceptance criteria**
- Cache invalidation is tested after writes.
- Nearby search returns expected fixtures.
- Cache benefits are measured or explicitly remain unproven.

# Phase 23 — Redis rate limiting, Lua, and distributed locks

**Objective:** Demonstrate safe shared-state primitives.

**Tasks**
- Implement a Redis-backed sliding-window rate limiter for selected HTTP endpoints.
- Use Lua for operations requiring atomic multi-command behavior.
- Add a distributed lock for simulated vehicle commands only if needed to prevent duplicate concurrent commands.
- Define lock TTL, owner token, safe release, timeout, and failure behavior.
- Do not use locks as a substitute for DB constraints/idempotency.
- Add concurrent tests.

**Acceptance criteria**
- Limits are shared across service instances.
- Lua operations are atomic under concurrent load.
- Non-owners cannot release locks; crashes do not leave permanent locks.
- Failure modes are documented.

# Phase 24 — Redis Pub/Sub and WebSocket

**Objective:** Stream current state to connected dashboards.

**Tasks**
- Publish state updates through Redis Pub/Sub.
- Implement WebSocket in a clearly owned backend service or a dedicated real-time component with a documented reason.
- Handle disconnects, heartbeats, backpressure, and bounded buffers.
- Configure `/ws` through Nginx.
- Document Pub/Sub's non-durable behavior; use REST snapshots or replay for reconnect recovery.

**Acceptance criteria**
- A browser/test client receives live updates through Nginx.
- Slow/disconnected clients do not cause unbounded memory growth.
- Reconnect recovers current state from a snapshot.
- WebSocket behavior is tested.

# Phase 25 — Frontend foundation

**Objective:** Build the independent Next.js app and API client.

**Tasks**
- Set up Next.js + TypeScript in `frontend/web`.
- Add layout/navigation, reusable components, loading/error/empty states, environment config, and typed API client.
- Use Nginx as local API/WebSocket entry point.
- Avoid importing backend runtime code into frontend.
- Never connect frontend directly to databases or brokers.

**Acceptance criteria**
- Frontend starts independently.
- API base URL is configurable.
- REST calls go through Nginx.
- Build/type-check passes.

# Phase 26 — Dashboard and operational pages

**Objective:** Present real system data in a useful portfolio UI.

**Tasks**
- Add `/dashboard`, `/vehicles`, `/vehicles/[id]`, `/alerts`, `/analytics`, and `/kafka`.
- Display online vehicles, events/sec, active alerts, average speed/fuel, Kafka lag, and service health only where actual data/metrics exist.
- Add pagination, filtering, time ranges, and explicit loading/error states.
- Clearly distinguish live data from demo/sample data.

**Acceptance criteria**
- Pages use real backend endpoints where available.
- Empty/error states work.
- UI does not fabricate live operational metrics.

# Phase 27 — Live vehicle map

**Objective:** Show real-time vehicle locations using free map tooling.

**Tasks**
- Integrate Leaflet/React Leaflet and OpenStreetMap.
- Show markers, status, selected vehicle details, alerts, filters/search, and movement history where data exists.
- Update through WebSocket and recover state with REST.
- Keep map attribution visible.
- Do not use paid map APIs or tokens.
- Document that public OSM tile servers have usage policies and are not an unlimited production tile backend; use an appropriate self-hosted/free tile strategy for heavier deployment.

**Acceptance criteria**
- Map renders without paid credentials.
- Markers use backend data.
- Reconnect restores state.
- Attribution and tile-use limitations are documented.

# Phase 28 — Kafka consumer scaling and replay

**Objective:** Demonstrate partitioned consumption, lag, scaling, and replay.

**Tasks**
- Add configurable consumer concurrency and graceful shutdown.
- Measure lag and processing throughput.
- Demonstrate rebalancing when consumers stop/start.
- Implement controlled replay/backfill without corrupting live analytics.
- Document consumer-group limits relative to partitions and ordering.
- Test replay against idempotency.

**Acceptance criteria**
- Scaling behavior is measured.
- Replay can repeat without duplicate aggregate corruption.
- Offset/group commands are documented.
- Rebalancing behavior is captured.

# Phase 29 — MongoDB Change Streams

**Objective:** Demonstrate change-driven processing where useful.

**Tasks**
- Use Change Streams for selected vehicle/device configuration changes or derived notifications, not as a replacement for the main telemetry Kafka pipeline.
- Handle resume tokens and invalidation/recovery.
- Document replica-set requirements.
- Test restart/resume behavior.

**Acceptance criteria**
- Change Stream works with local infrastructure.
- Restart behavior is tested.
- The use case is justified and avoids needless duplication.

# Phase 30 — Event versioning, Protobuf, and schema registry

**Objective:** Evolve event contracts safely.

**Tasks**
- Document compatibility rules for adding/removing/renaming fields.
- Add Protobuf definitions for selected events.
- Select a free/open-source schema registry that can be self-hosted locally and fits the chosen Kafka/protobuf workflow; verify current license and compatibility before implementing.
- Add producer/consumer serialization tests.
- Demonstrate compatible evolution and reject an incompatible example.
- Keep JSON debug support if useful.

**Acceptance criteria**
- Compatibility is tested, not just described.
- Registry runs locally without paid accounts.
- Guarantees and limitations are documented.

# Phase 31 — Prometheus metrics

**Objective:** Expose measurable service and infrastructure behavior.

**Tasks**
- Add Prometheus-compatible metrics.
- Include HTTP counts/latency, producer throughput/errors, consumer throughput/lag, DB/Redis operation latency where practical, WebSocket connections, and RabbitMQ queue/job metrics where available.
- Avoid high-cardinality labels such as raw vehicle IDs or event IDs.
- Add scrape configuration and document metric units.

**Acceptance criteria**
- Prometheus scrapes real metrics.
- Labels remain bounded.
- Metrics have clear meanings and units.

# Phase 32 — Grafana dashboards and OpenTelemetry

**Objective:** Visualize health and trace meaningful workflows.

**Tasks**
- Provision Grafana dashboards for service health, HTTP latency, Kafka throughput/lag, database behavior, Redis, and RabbitMQ.
- Add OpenTelemetry instrumentation for HTTP and selected internal operations.
- Propagate trace/correlation/event IDs where appropriate.
- Configure a free local telemetry collector/backend if required.
- Document traced and untraced boundaries.

**Acceptance criteria**
- Dashboards load from provisioning files.
- Metrics come from running components.
- Sample traces follow a meaningful path.
- No paid observability SaaS is required.

# Phase 33 — Failure drills and recovery evidence

**Objective:** Prove failure handling.

**Tasks**
Run and document repeatable drills:
1. Stop Analytics consumer; verify lag grows; restart and verify catch-up.
2. Stop Alert Service; verify consumer recovery.
3. Stop Redis; verify controlled degradation and recovery.
4. Stop RabbitMQ worker; verify queue growth and later processing.
5. Stop a Kafka consumer; observe rebalance.
6. Stop a database temporarily; verify error/retry behavior and recovery.
7. Deliver duplicate events; verify idempotency.
8. Deliver poison messages; verify retry/DLQ handling.
9. Disconnect WebSocket clients; verify reconnect/snapshot recovery.
10. Restart containers and verify persistence where expected.

**Acceptance criteria**
- Each drill records setup, command, observed behavior, recovery, and limitations.
- Never claim zero data loss unless proven.
- Critical failures are fixed before final benchmarks.

# Phase 34 — Multi-broker Kafka lab

**Objective:** Extend Kafka to a multi-broker topology for replication/failure experiments.

**Tasks**
- Add a separate Compose profile for a 3-broker local cluster.
- Configure replication factor and minimum in-sync replicas for the test.
- Explain resource costs and single-machine limitations.
- Test broker failure, leader election, producer behavior, and consumer recovery.
- Keep default local setup lightweight.

**Acceptance criteria**
- Multi-broker mode starts with documented commands.
- Broker-failure results are recorded.
- Replication settings and guarantees are accurately explained.

# Phase 35 — Load testing and bottleneck analysis

**Objective:** Benchmark the full system honestly.

**Tasks**
- Use free local k6 or Artillery for APIs and an appropriate custom producer/load harness for Kafka event rates.
- Increase load only as hardware allows.
- Measure end-to-end throughput, ingestion errors, p50/p95/p99 latency, lag/catch-up, CPU/RAM, database performance, and queue depth.
- Separate producer-only and end-to-end benchmarks.
- Save raw outputs, machine details, test scripts, and findings.
- Identify the first bottleneck and optimize based on evidence.

**Acceptance criteria**
- Results are repeatable enough for comparison.
- Every result records machine specs, Compose profile, configuration, and duration.
- No invented performance numbers or unsupported scale claims appear.

# Phase 36 — Optimization pass

**Objective:** Improve measured bottlenecks without compromising correctness.

**Tasks**
- Prioritize using profiles, query plans, metrics, and benchmark evidence.
- Tune Kafka batching/compression/partitions, consumer batches/concurrency, DB indexes/batching, Redis calls, serialization, and WebSocket backpressure only where evidence supports it.
- Repeat benchmarks before/after meaningful changes.
- Record regressions and trade-offs.

**Acceptance criteria**
- Each optimization includes evidence and before/after data.
- Reliability tests still pass.
- No unmeasured optimization is presented as a proven improvement.

# Phase 37 — Production-style Docker and Nginx hardening

**Objective:** Make the local system reproducible and production-shaped without requiring deployment.

**Tasks**
- Add multi-stage Dockerfiles, non-root execution where feasible, health checks, sensible resource defaults, and graceful shutdown.
- Use Nginx in local and production-style Compose.
- Add internal networks, restart policies, log behavior, request limits, timeouts, and environment separation.
- Verify REST and WebSocket routes.
- Add a lightweight Compose profile and full observability/multi-broker profile.
- Document that one machine is not a true multi-host production environment.

**Acceptance criteria**
- Fresh setup starts using documented commands.
- Nginx is the entry point for frontend/backend HTTP and WebSocket traffic.
- Secrets are not committed.
- Optional profiles report their status clearly.

# Phase 38 — Documentation and portfolio release

**Objective:** Make the project understandable, reproducible, and credible.

**Tasks**
- Write root README: problem, architecture, stack, prerequisites, startup, demo flow, APIs, and screenshots if available.
- Document service responsibilities and data ownership.
- Add architecture/event-flow diagrams.
- Document event contracts, Kafka topics/partitions, idempotency, retries/DLQ, Redis keys, Nginx routing, database decisions, and limitations.
- Add API examples/OpenAPI if useful.
- Add benchmark methodology/results and failure-drill reports.
- Add troubleshooting and teardown/reset instructions.
- Verify instructions on a clean checkout where possible.

**Acceptance criteria**
- A reviewer can understand the system without reading every file.
- A developer can start the core project from the README.
- Benchmark claims point to actual artifacts.
- Free-only policy and exclusions are clear.

---

## 5. Non-negotiable architecture rules

### Data ownership
- Telemetry Service owns MongoDB vehicle/device/telemetry data.
- Analytics Service owns PostgreSQL analytical tables.
- Alert Service owns MySQL alert/incident data.
- Redis stores derived/current state and cache, not the only durable record of critical business data.
- Kafka is the event-stream backbone within its configured retention/replication limits.
- RabbitMQ handles jobs/commands and retry/DLQ workflows.

### Reliability
- Assume at-least-once delivery unless a stronger end-to-end guarantee is actually proven.
- Make consumers idempotent.
- Commit Kafka offsets only after durable processing.
- ACK RabbitMQ messages only after successful processing.
- Use bounded retries and dead-letter handling.
- Design for duplicate, delayed, and out-of-order events.
- Do not claim distributed transactions or exactly-once behavior without evidence.
- Document the MongoDB/Kafka dual-write risk; consider a transactional outbox if the implementation demonstrates unacceptable loss risk.

### Nginx
- Nginx is a reverse proxy, not a custom API Gateway.
- It is used locally and in production-style Compose.
- It routes REST paths and WebSocket traffic.
- Frontend uses Nginx as the API/WebSocket entry point.
- Services use Docker service names internally.
- Do not add a custom Node.js proxy.

### Explicit exclusions
Do not add unless the project owner changes scope:
- API Gateway or custom gateway service
- Login/register, user service, JWT, RBAC, authentication/authorization implementation
- Paid cloud, paid SaaS, paid APIs
- Paid map/monitoring/registry APIs
- Frontend direct database/broker access
- Unmeasured performance claims

## 6. First task for the AI workflow

Start with **Phase 0 only**. Inspect the current repository and tooling, report the baseline, create/update `docs/PHASE_STATUS.md`, and propose Phase 1 changes. Do not start Phase 1 until Phase 0 is complete and reported.
