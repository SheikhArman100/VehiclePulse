-- ============================================================================
-- Phase 16: PostgreSQL Advanced Optimization Migration
-- 1. Partial Covering Index for Active Trips
-- 2. Composite Covering Index for Temporal Vehicle Aggregates
-- 3. BRIN Index for Processed Events Append-Only Audit Stream
-- 4. Materialized View for Fast Fleet KPI Rollups
-- ============================================================================

-- 1. Active Trips Partial Covering Index:
-- Eliminates bitmap heap scan and in-memory sort by indexing only ACTIVE trips in reverse chronological order
-- with INCLUDE columns covering the entire SELECT payload (Index-Only Scan).
CREATE INDEX IF NOT EXISTS "idx_vehicle_trips_active_covering"
ON "vehicle_trips" ("startTime" DESC)
INCLUDE ("id", "vehicleId", "distanceKm", "avgSpeedKmh", "maxSpeedKmh")
WHERE "status" = 'ACTIVE';

-- 2. Covering Composite Index on Hourly Vehicle Stats
-- Covers vehicleId + bucketStart range with distanceKm and avgSpeedKmh
CREATE INDEX IF NOT EXISTS "idx_hourly_stats_vehicle_temporal_covering"
ON "hourly_vehicle_stats" ("vehicleId", "bucketStart" DESC)
INCLUDE ("avgSpeedKmh", "distanceKm", "maxSpeedKmh", "idleTimeSeconds");

-- 3. BRIN (Block Range Index) on Processed Events
-- Processed events table is strictly append-only ordered by processedAt.
-- BRIN takes negligible disk space (kilobytes instead of megabytes) while maintaining rapid range queries.
CREATE INDEX IF NOT EXISTS "idx_processed_events_processedAt_brin"
ON "processed_events" USING BRIN ("processedAt");

-- 4. Materialized View for Fleet High-Level Aggregates
CREATE MATERIALIZED VIEW IF NOT EXISTS "mv_fleet_daily_summary" AS
SELECT
  date_trunc('day', "bucketStart")::date AS "statDate",
  COUNT(DISTINCT "vehicleId") AS "activeVehicles",
  ROUND(SUM("distanceKm")::numeric, 2) AS "totalFleetDistanceKm",
  ROUND(AVG("avgSpeedKmh")::numeric, 2) AS "fleetAvgSpeedKmh",
  ROUND(MAX("maxSpeedKmh")::numeric, 2) AS "peakSpeedKmh",
  SUM("idleTimeSeconds") AS "totalFleetIdleSeconds",
  SUM("eventCount") AS "totalFleetEvents"
FROM "hourly_vehicle_stats"
GROUP BY date_trunc('day', "bucketStart")::date
ORDER BY "statDate" DESC;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_mv_fleet_daily_summary_statDate"
ON "mv_fleet_daily_summary" ("statDate");

-- Re-analyze tables for updated query planner statistics
ANALYZE vehicle_trips;
ANALYZE hourly_vehicle_stats;
ANALYZE processed_events;
