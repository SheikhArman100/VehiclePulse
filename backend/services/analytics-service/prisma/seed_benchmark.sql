INSERT INTO processed_events ("eventId", "eventType", "vehicleId", "processedAt")
SELECT
  'bench_' || i,
  'telemetry.raw',
  'veh_' || (i % 25),
  NOW() - (i || ' seconds')::interval
FROM generate_series(1, 100000) AS i
ON CONFLICT DO NOTHING;

INSERT INTO vehicle_trips ("id", "vehicleId", "startTime", "endTime", "startLatitude", "startLongitude", "endLatitude", "endLongitude", "distanceKm", "avgSpeedKmh", "maxSpeedKmh", "fuelConsumedL", "idleTimeSeconds", "status", "createdAt", "updatedAt")
SELECT
  'trip_' || i,
  'veh_' || (i % 25),
  NOW() - ((i * 1800) || ' seconds')::interval,
  CASE WHEN i % 5 = 0 THEN NULL ELSE NOW() - ((i * 1800 - 1200) || ' seconds')::interval END,
  37.7749 + (i % 10) * 0.01,
  -122.4194 + (i % 10) * 0.01,
  37.8000,
  -122.4000,
  12.5 + (i % 20),
  55.0 + (i % 30),
  85.0 + (i % 20),
  1.5 + (i % 3),
  60,
  CASE WHEN i % 5 = 0 THEN 'ACTIVE' ELSE 'COMPLETED' END,
  NOW(),
  NOW()
FROM generate_series(1, 50000) AS i
ON CONFLICT DO NOTHING;

INSERT INTO hourly_vehicle_stats ("id", "vehicleId", "bucketStart", "bucketEnd", "distanceKm", "avgSpeedKmh", "maxSpeedKmh", "fuelConsumedL", "idleTimeSeconds", "eventCount", "createdAt", "updatedAt")
SELECT
  'hourly_' || i,
  'veh_' || (i % 25),
  date_trunc('hour', NOW() - ((i * 3600) || ' seconds')::interval),
  date_trunc('hour', NOW() - ((i * 3600) || ' seconds')::interval) + interval '1 hour',
  25.0 + (i % 15),
  62.0 + (i % 20),
  90.0,
  2.8,
  120,
  360,
  NOW(),
  NOW()
FROM generate_series(1, 20000) AS i
ON CONFLICT ("vehicleId", "bucketStart") DO NOTHING;

VACUUM ANALYZE processed_events;
VACUUM ANALYZE vehicle_trips;
VACUUM ANALYZE hourly_vehicle_stats;
