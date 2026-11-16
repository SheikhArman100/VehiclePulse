# Phase 32 Architecture Documentation: Grafana Dashboards and OpenTelemetry Tracing

## 1. Overview
VehiclePulse integrates **Grafana 11.2.0** (100% free open-source declarative observability) alongside standard **W3C OpenTelemetry Trace Context propagation** across its microservices.

- **Grafana URL**: `http://localhost:3001` (Anonymous Viewer access enabled; Admin credentials `admin`/`admin`).
- **Datasource**: Auto-provisioned Prometheus (`http://prometheus:9090`).
- **Distributed Tracing**: In-process zero-dependency W3C `traceparent` context tracking integrated via `AsyncLocalStorage` and Kafka headers.

---

## 2. Declarative Grafana Dashboards Catalog

The following declarative dashboard JSON files are auto-loaded from `backend/infrastructure/grafana/dashboards/`:

1. **`service-health.json` (`VehiclePulse — Service Health & Overview`)**:
   - **Active Microservices**: Stat panel tracking target health (`count(up == 1)`).
   - **HTTP Throughput & Error Rate**: Overall request rate (req/s) and HTTP 5xx error percentage.
   - **Active WebSockets**: Live concurrent browser connections.
   - **Route Breakdown & Latencies**: Request volume and p50, p95, p99 latency distributions across API endpoints.
   - **Node.js Process Metrics**: Resident Memory (RSS) and CPU % utilization per service.

2. **`kafka-streaming.json` (`VehiclePulse — Kafka & Event Streaming`)**:
   - **Throughput Rates**: Raw messages published vs. consumed per second.
   - **Consumer Group Rates**: Partition consumption speed per group (`telemetry-mongo-storage-group`, `analytics-consumer-group`, `alert-service-group`).
   - **Consumer Partition Lag**: Real-time gauge tracking unconsumed offsets per partition.
   - **WebSocket Fan-out**: Active client socket count and live telemetry frame broadcast rate.

3. **`datastores-performance.json` (`VehiclePulse — Datastores & Runtime Performance`)**:
   - **Database Operation Latencies**: p95 duration across MongoDB time-series inserts, PostgreSQL rollups, MySQL transactions, and Redis cache.
   - **Error Counters**: Granular storage error rate by database system and operation.
   - **Node.js Runtime Health**: V8 Garbage collection pause times and libuv event loop p99 delay.

---

## 3. Distributed Tracing & W3C Trace Context Propagation

### Traceparent Header Specification
All services implement standard W3C `traceparent` (`version-trace_id-parent_id-trace_flags`):
```text
traceparent: 00-5942360d16e949500317421a9e19f0d4-7e24ed4fcebd63c7-01
```

### Tracing Architecture:
1. **HTTP Ingress**: `openTelemetryMiddleware(serviceName)` in `@vehicle-pulse/shared`:
   - Inspects incoming `traceparent` header; parses trace ID and parent span ID, or generates a fresh 16-byte hex trace ID and 8-byte hex span ID.
   - Binds `correlationId` and `requestId` to the active `TraceContext`.
   - Stores context in thread-safe `AsyncLocalStorage` (`traceStorage`).
   - Injects the updated `traceparent` into outgoing HTTP response headers.
2. **Kafka Event Propagation**:
   - `injectTraceContext(headers)` in `telemetryProducer.ts`: Injects `traceparent` and `x-correlation-id` into Kafka message headers.
   - Consumers (`mongoConsumer.ts`, `analyticsConsumer.ts`, `alertConsumer.ts`) can extract the context using `runInKafkaTraceContext()`.

### Traced vs. Untraced Boundaries:
- **Traced Boundaries**:
  - All public and reverse-proxied HTTP REST endpoints (`/api/telemetry/*`, `/api/analytics/*`, `/api/alerts/*`).
  - Kafka event publishing (`vehicle.telemetry.raw`).
- **Untraced Boundaries**:
  - Raw TCP WebSocket transport frame streams (client metadata tracks connection lifecycle rather than per-frame spans to avoid memory bloat).
  - Internal RabbitMQ RPC health ping checks.

---

## 4. Verification Evidence

1. **Grafana Health**:
   ```bash
   curl http://localhost:3001/api/health
   # Returns: {"database":"ok","version":"11.2.0",...}
   ```
2. **Dashboard Provisioning**:
   ```bash
   curl http://localhost:3001/api/search
   # Returns 3 provisioned dashboards in folder "VehiclePulse"
   ```
3. **Trace Context Propagation**:
   ```bash
   curl -I http://localhost:4001/api/telemetry/health/live
   # Returns: traceparent: 00-5942360d16e949500317421a9e19f0d4-7e24ed4fcebd63c7-01
   ```

