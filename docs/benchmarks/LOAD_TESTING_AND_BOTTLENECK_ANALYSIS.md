# Phase 35 Architecture Report: Load Testing & Bottleneck Analysis

## 1. Test Environment & Hardware Specification
All benchmarks were executed locally against the live Docker Compose microservice topology:
- **Processor**: AMD Ryzen 5 5600 6-Core Processor (12 Logical Cores @ 3.50 GHz - 4.40 GHz Boost)
- **RAM**: 16 GB DDR4 (15.93 GB visible, ~4.7 GB free physical memory)
- **Host OS**: Microsoft Windows 10 Pro (x64) + WSL2 Linux Kernel 5.15
- **Node.js**: v24.22.1 (V8 engine 13.x)
- **Container Engine**: Docker Desktop 29.9.2 (KRaft Kafka 3.8.1, Nginx 1.27.4, Redis 7.4.2, Mongo 7.0.14, Postgres 16.8, MySQL 8.4)

---

## 2. Benchmark 1: Isolated Kafka Producer Throughput

Tested raw Kafka message publishing under varied batch sizes and compression algorithms. Volume: **10,000 telemetry messages** per configuration into topic `vehicle.telemetry.raw`.

| Batch Size | Compression | Duration (s) | Throughput (msg/sec) | Avg Latency / Batch |
|---|---|---|---|---|
| **50** | **NONE** | **0.75s** | **13,343 msg/s** | **3.75 ms** |
| 50 | GZIP | 1.26s | 7,956 msg/s | 6.28 ms |
| 250 | NONE | 4.18s | 2,394 msg/s | 104.43 ms |
| **250** | **GZIP** | **0.82s** | **12,172 msg/s** | **20.54 ms** |
| 500 | NONE | 1.99s | 5,024 msg/s | 99.53 ms |
| 500 | GZIP | 0.85s | 11,827 msg/s | 42.28 ms |

### Key Findings:
- **Peak Throughput**: **13,343 msg/sec** achieved with a compact batch size of 50 without compression overhead on local loopback.
- **Compression Efficiency**: For larger batch sizes (>= 250), **GZIP provides a ~5x throughput improvement** (12,172 msg/s vs 2,394 msg/s) by drastically reducing TCP socket write calls and buffer sizes.

---

## 3. Benchmark 2: HTTP End-to-End & Nginx Reverse Proxy Concurrency

Tested concurrent REST endpoints under simulated user loads (1,000 requests per benchmark).

| Endpoint | Protocol / Port | Concurrency | Success / Fail | Throughput (req/s) | p50 Latency | p95 Latency | p99 Latency |
|---|---|---|---|---|---|---|---|
| **Direct Telemetry Ingest** | `POST :4001/api/v1/telemetry` | 10 | 1,000 / 0 | **518 req/s** | 14.31 ms | 38.52 ms | 202.77 ms |
| **Nginx Ingest Proxy** | `POST :80/api/telemetry/...` | 20 | 1,000 / 0 | **546 req/s** | 26.60 ms | 66.75 ms | 305.92 ms |
| **PostgreSQL Analytics** | `GET :80/api/analytics/...` | 25 | 1,000 / 0 | **811 req/s** | 27.54 ms | 38.15 ms | 96.96 ms |
| **MySQL Alerts Triage** | `GET :80/api/alerts/...` | 25 | 1,000 / 0 | **565 req/s** | 42.42 ms | 54.77 ms | 57.58 ms |

### Key Findings:
- Zero request failures (100% success rate across all 4,000 test requests).
- Read APIs achieved **811 req/sec** through Nginx reverse proxy with a tight p95 latency of **38.15 ms** on PostgreSQL analytics queries.
- Nginx reverse proxy adds negligible overhead (~10ms additional p50 latency) while multiplexing connections effectively.

---

## 4. Benchmark 3: End-to-End Pipeline Drain & Lag

Tested the pipeline with a rapid burst of **5,000 valid telemetry events**:
- **Burst Publishing Duration**: 1.00s (**4,987 msg/sec**)
- **Target Consumer Groups**:
  - `telemetry-mongo-storage-group` (MongoDB time-series insert)
  - `analytics-consumer-group` (PostgreSQL aggregation computation)
  - `alert-service-group` (MySQL rule evaluation)
- **Pipeline Catch-Up Duration**: **1 second**
- **Residual Lag**: **0 messages** across all consumer groups.

---

## 5. Primary Bottleneck Identification

Based on empirical data across the benchmarks, the primary architectural bottleneck was identified:

### **Primary Bottleneck: HTTP Ingestion Serialization & Zod Schema Validation**
- Direct Kafka writes achieve **13,343 msg/sec**.
- However, single-event HTTP ingestion tops out at **~546 req/sec**.
- **Root Cause**:
  1. Per-request HTTP JSON parsing and Zod recursive schema validation on Node.js single-threaded event loop.
  2. Individual single-record Kafka producer sends per HTTP request rather than producer-side buffering (`linger.ms`).
- **Optimization Opportunities for Phase 36**:
  1. Add micro-batching (`linger.ms: 5` and `batch.size: 16384`) in the Express Telemetry Producer.
  2. Enable Kafka producer batch endpoint (`POST /api/v1/telemetry/batch`).
  3. Pre-compile / fast-path Zod schema checks for raw telemetry payloads.

