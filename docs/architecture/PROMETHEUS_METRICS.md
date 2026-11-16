# Phase 31 Architecture Documentation: Prometheus Metrics & Observability

## 1. Overview
VehiclePulse employs **Prometheus** (100% free open-source time-series monitoring engine) to aggregate, scrape, and evaluate operational metrics across microservices.

- **Prometheus Version**: `prom/prometheus:v2.54.1` running locally in Docker Compose.
- **Port**: `9090` (Web UI, API, TSDB).
- **Scrape Interval**: 15 seconds.
- **Scraped Endpoints**:
  - `telemetry-service:4001/metrics`
  - `analytics-service:4002/metrics`
  - `alert-service:4003/metrics`
  - `localhost:9090/metrics` (Prometheus internal engine health)

---

## 2. Cardinality Safety Guidelines
Prometheus stores time series identified by metric name and label sets. Dynamic labels with high cardinality (e.g. `vehicleId`, `eventId`, user UUIDs, or raw database query strings) cause memory explosion.

### Enforced Cardinality Policy:
- **Forbidden**: `vehicleId`, `eventId`, `userId`, `query`, `error_message`.
- **Permitted**: `method` (GET, POST), `route` (normalized route patterns like `/vehicles/:id`), `status_code` (200, 400, 500), `topic` (`vehicle.telemetry.raw`), `consumer_group`, `db_system` (`mongodb`, `postgres`, `mysql`, `redis`), `operation` (`insert`, `select`, `publish`).

---

## 3. Metrics Catalog & Units

| Metric Name | Type | Labels | Description / Units |
|---|---|---|---|
| `vehiclepulse_http_requests_total` | Counter | `method`, `route`, `status_code` | Total HTTP requests processed across microservices. |
| `vehiclepulse_http_request_duration_seconds` | Histogram | `method`, `route`, `status_code` | Latency distribution of HTTP requests in seconds (Buckets: 5ms to 5s). |
| `vehiclepulse_kafka_messages_produced_total` | Counter | `topic` | Cumulative number of messages produced to Kafka. |
| `vehiclepulse_kafka_producer_errors_total` | Counter | `topic` | Cumulative number of publisher failures. |
| `vehiclepulse_kafka_messages_consumed_total` | Counter | `topic`, `consumer_group` | Cumulative messages received by Kafka consumers. |
| `vehiclepulse_kafka_consumer_errors_total` | Counter | `topic`, `consumer_group` | Errors encountered during Kafka deserialization / handling. |
| `vehiclepulse_kafka_consumer_lag` | Gauge | `topic`, `consumer_group`, `partition` | Real-time offset lag per partition. |
| `vehiclepulse_websocket_connections_active` | Gauge | *None* | Real-time active WebSocket client connections. |
| `vehiclepulse_websocket_messages_broadcast_total`| Counter | *None* | Cumulative state broadcast events sent to WebSocket clients. |
| `vehiclepulse_db_operation_duration_seconds` | Histogram | `db_system`, `operation` | Database / cache read/write latency in seconds. |
| `vehiclepulse_db_operation_errors_total` | Counter | `db_system`, `operation` | Database / cache connection or transaction errors. |
| `vehiclepulse_nodejs_*` & `vehiclepulse_process_*` | Various | *Node.js internal* | V8 GC pause duration, Event loop lag, Heap memory, CPU usage, file descriptors. |

---

## 4. Operational Verification

1. **Verify Prometheus Health & Scrape Targets**:
   ```bash
   curl -s http://localhost:9090/api/v1/targets | jq .data.activeTargets[].health
   # Returns "up" for all microservices
   ```

2. **Verify Telemetry Service Metrics**:
   ```bash
   curl -s http://localhost:4001/metrics | grep "vehiclepulse_"
   ```

3. **Verify Analytics & Alert Service Metrics**:
   ```bash
   curl -s http://localhost:4002/metrics
   curl -s http://localhost:4003/metrics
   ```

