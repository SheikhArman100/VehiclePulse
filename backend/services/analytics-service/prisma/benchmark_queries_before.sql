\timing on

-- Query 1: Active Trips Query (Before Partial Covering Index)
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, "vehicleId", "startTime", "distanceKm", "avgSpeedKmh", "maxSpeedKmh"
FROM vehicle_trips
WHERE status = 'ACTIVE'
ORDER BY "startTime" DESC
LIMIT 10;

-- Query 2: Fleet Performance Aggregate with CTE & Window Function (Moving Average & Ranking)
EXPLAIN (ANALYZE, BUFFERS)
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
    ) as "distanceRank"
  FROM hourly_vehicle_stats
  WHERE "bucketStart" >= NOW() - interval '30 days'
)
SELECT "vehicleId", "bucketStart", "avgSpeedKmh", "movingAvgSpeed", "distanceKm", "distanceRank"
FROM vehicle_recent_stats
WHERE "distanceRank" <= 3
ORDER BY "vehicleId", "distanceRank"
LIMIT 20;
