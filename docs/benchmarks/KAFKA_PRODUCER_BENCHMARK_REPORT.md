# Kafka Producer Throughput & Latency Benchmark Report (Phase 13)

**Document Reference:** `docs/benchmarks/KAFKA_PRODUCER_BENCHMARK_REPORT.md`  
**Execution Date:** 2026-10-28  
**Tested Stack:** Apache Kafka 3.8.1 (KRaft mode single-broker on Docker), KafkaJS Producer, Node.js v24.22.1  
**Hardware Profile:** AMD Ryzen 5 5600 6-Core Processor (12 logical cores), 15.93 GB RAM, Windows x64  

---

## 1. Executive Summary

Phase 13 establishes the baseline performance profile of our telemetry streaming pipeline before adding downstream consumer loads (Analytics and Alerts services).

We benchmarked producer throughput and batch latency across 4 distinct scales:
- **1,000 events** (small baseline, batch: 50, compression: none)
- **5,000 events** (medium scale, batch: 100, compression: none)
- **10,000 events** (high scale, batch: 200, compression: gzip)
- **25,000 events** (stress test, batch: 500, compression: gzip)

### Key Finding:
- **Peak Throughput:** **25,125.6 events/sec** (at 10,000 events with batch size 200 and gzip compression), moving **10.81 MB/s** over Kafka.
- **Latency Consistency:** Median batch latency (p50) ranged from **5.0 ms** (with compression) to **58.0 ms** (under large 500-message batch bursts).
- **Error Rate:** **0% error rate** across all 41,000 benchmarked events.

---

## 2. Benchmark Results Matrix

| Scenario | Target Events | Batch Size | Compression | Elapsed Time | Throughput (evt/s) | Throughput (MB/s) | Avg Latency | p50 Latency | p95 Latency | p99 Latency | Errors |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **1K Baseline** | 1,000 | 50 | None | 1.02s | **980.4 evt/s** | 0.42 MB/s | 50.5 ms | 50 ms | 60 ms | 60 ms | 0 |
| **5K Scale** | 5,000 | 100 | None | 2.56s | **1,956.2 evt/s** | 0.84 MB/s | 50.8 ms | 50 ms | 60 ms | 65 ms | 0 |
| **10K Peak** | 10,000 | 200 | GZIP | 0.40s | **25,125.6 evt/s** | 10.81 MB/s | 7.1 ms | 5 ms | 9 ms | 78 ms | 0 |
| **25K Stress** | 25,000 | 500 | GZIP | 2.92s | **8,561.6 evt/s** | 3.68 MB/s | 56.6 ms | 58 ms | 68 ms | 77 ms | 0 |

---

## 3. Analysis & Bottleneck Identification

### A. Impact of Batching & Compression
- **No Compression (Batch 50-100):** Produced between ~1,000 and ~2,000 evt/s with ~50ms round-trip batch latency. The producer spent most of its time blocked on network socket flushes.
- **GZIP Compression (Batch 200):** Achieved the highest efficiency (**25,125 evt/s**). Compressing multiple telemetry events dramatically reduces wire bytes and broker socket I/O, allowing Kafka to acknowledge batches in just ~5ms–7ms.
- **Large Batches (Batch 500):** At batch size 500, CPU serialization overhead and buffer allocation caused throughput to settle at ~8,560 evt/s.

### B. Hardware & Architecture Limits
1. **Single-Broker Disk I/O:**
   - In our local Docker Compose stack, Kafka runs on a single node backed by a local Docker volume.
   - For sustained workloads exceeding 25K evt/s, broker disk write throughput and partition lock contention become the primary gating factors.
2. **Node.js Single-Threaded Event Loop:**
   - JSON serialization of 25,000 nested telemetry objects takes measurable CPU cycles on the Node.js V8 main thread.
   - In Phase 30, **Protocol Buffers (Protobuf)** will be introduced to drastically lower CPU serialization time compared to JSON.

---

## 4. How to Repeat the Benchmark

The benchmark harness is automated in `@vehicle-pulse/kafka-admin`:

```bash
# Run standard 10,000 event test with batch size 200
npm run benchmark --workspace=@vehicle-pulse/kafka-admin -- --events=10000 --batch=200 --vehicles=100 --compression=gzip

# Run 25,000 event stress test
npm run benchmark --workspace=@vehicle-pulse/kafka-admin -- --events=25000 --batch=500 --vehicles=200 --compression=gzip
```

All raw test runs are persisted as JSON artifacts under `docs/benchmarks/`.
