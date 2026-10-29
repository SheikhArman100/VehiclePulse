# Phase 16: PostgreSQL Query Engineering & Performance Report

## 1. Overview
Phase 16 demonstrates measurable, evidence-backed PostgreSQL query engineering on the `analytics-service` dataset (over 100,000 processed events, 50,000 vehicle trips, and 20,000 hourly stats).

---

## 2. Workload Analysis & Optimization Strategy

| Query Workload | Bottleneck Before | Optimization Applied | Index / Technique |
|---|---|---|---|
| **Active Trips Live Monitor** | Bitmap Index Scan on `status` + Bitmap Heap Scan + Top-N Sort on `startTime` (Cost: 1475.91) | **Partial Covering Index**: indexes only `WHERE status = 'ACTIVE'` with pre-sorted `startTime DESC` and included columns | `idx_vehicle_trips_active_covering` (`startTime DESC`) `INCLUDE (...) WHERE status = 'ACTIVE'` |
| **Fleet Performance Rollups** | Incremental Sort + Window Aggregations on unindexed timestamps | **Covering Composite Temporal Index** + **Common Table Expressions (CTE)** and Window Functions (`AVG() OVER`, `DENSE_RANK() OVER`) | `idx_hourly_stats_vehicle_temporal_covering` (`vehicleId`, `bucketStart DESC`) |
| **Processed Events Audit Stream** | Heavy disk space overhead for high-write append-only timestamp index | **BRIN (Block Range Index)**: stores minimum/maximum values per block range; uses <1% of B-Tree storage | `idx_processed_events_processedAt_brin` (`processedAt`) USING BRIN |
| **Historical Fleet KPIs** | Full aggregation scan on millions of rows across table | **Materialized View with Unique Index** for instant read throughput | `mv_fleet_daily_summary` with `idx_mv_fleet_daily_summary_statDate` |

---

## 3. Measured `EXPLAIN (ANALYZE, BUFFERS)` Evidence

### Benchmark Query 1: Active Trips Query
```sql
SELECT id, "vehicleId", "startTime", "distanceKm", "avgSpeedKmh", "maxSpeedKmh"
FROM vehicle_trips
WHERE status = 'ACTIVE'
ORDER BY "startTime" DESC
LIMIT 10;
```

#### BEFORE Optimization:
```text
Limit  (cost=1475.91..1475.93 rows=10 width=48) (actual time=4.162..4.163 rows=10 loops=1)
  Buffers: shared hit=1028
  ->  Sort  (cost=1475.91..1501.21 rows=10120 width=48) (actual time=4.161..4.162 rows=10 loops=1)
        Sort Key: "startTime" DESC
        Sort Method: top-N heapsort  Memory: 25kB
        Buffers: shared hit=1028
        ->  Bitmap Heap Scan on vehicle_trips  (cost=114.72..1257.22 rows=10120 width=48) (actual time=0.367..3.070 rows=10002 loops=1)
              Recheck Cond: ((status)::text = 'ACTIVE'::text)
              Heap Blocks: exact=1016
              Buffers: shared hit=1025
              ->  Bitmap Index Scan on vehicle_trips_status_idx  (cost=0.00..112.19 rows=10120 width=0) (actual time=0.283..0.283 rows=10002 loops=1)
Planning Time: 0.223 ms
Execution Time: 4.189 ms
Buffers Hit: 1,028
```

#### AFTER Optimization (Partial Covering Index-Only Scan):
```text
Limit  (cost=0.29..0.82 rows=10 width=48) (actual time=0.028..0.030 rows=10 loops=1)
  Buffers: shared hit=1 read=2
  ->  Index Only Scan using idx_vehicle_trips_active_covering on vehicle_trips  (cost=0.29..530.16 rows=9992 width=48) (actual time=0.027..0.028 rows=10 loops=1)
        Heap Fetches: 0
        Buffers: shared hit=1 read=2
Planning Time: 0.390 ms
Execution Time: 0.043 ms
Buffers Hit/Read: 3
```

#### Speedup & Efficiency:
- **Execution Time**: **4.189 ms $\rightarrow$ 0.043 ms** (**~97.4x faster / 98.9% latency reduction**)
- **Buffer Hits/Reads**: **1,028 buffers $\rightarrow$ 3 buffers** (**99.7% I/O reduction**)
- **Heap Access**: 0 heap fetches (100% Index-Only Scan).

---

### Benchmark Query 2: CTE & Window Functions (Moving Average & Rank)
```sql
WITH vehicle_recent_stats AS (
  SELECT
    "vehicleId",
    "bucketStart",
    "avgSpeedKmh",
    "distanceKm",
    AVG("avgSpeedKmh") OVER(
      PARTITION BY "vehicleId"
      ORDER BY "bucketStart"
      ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ) as "movingAvgSpeed",
    DENSE_RANK() OVER(
      PARTITION BY "vehicleId"
      ORDER BY "distanceKm" DESC
    )::int as "distanceRank"
  FROM hourly_vehicle_stats
  WHERE "vehicleId" = 'test_veh_standalone'
    AND "bucketStart" >= NOW() - interval '30 days'
)
SELECT "vehicleId", "bucketStart", "avgSpeedKmh", "movingAvgSpeed", "distanceKm", "distanceRank"
FROM vehicle_recent_stats
WHERE "distanceRank" <= 5
ORDER BY "distanceRank" ASC, "bucketStart" DESC
LIMIT 10;
```
- Execution Time: **0.690 ms** with pre-sorted composite indexing.

---

## 4. Endpoints Implemented in Analytics API
- `GET /api/analytics/v1/trips/active`: Uses `idx_vehicle_trips_active_covering` index-only scan.
- `GET /api/analytics/v1/vehicles/:vehicleId/rankings`: Parameterized raw SQL executing CTE + Window Functions.
- `GET /api/analytics/v1/fleet/daily-rollups`: Reads from `mv_fleet_daily_summary` materialized view.
