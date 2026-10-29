-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "processed_events" (
    "eventId" VARCHAR(64) NOT NULL,
    "eventType" VARCHAR(64) NOT NULL,
    "vehicleId" VARCHAR(64) NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_events_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "hourly_vehicle_stats" (
    "id" TEXT NOT NULL,
    "vehicleId" VARCHAR(64) NOT NULL,
    "bucketStart" TIMESTAMP(3) NOT NULL,
    "bucketEnd" TIMESTAMP(3) NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "avgSpeedKmh" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "maxSpeedKmh" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "fuelConsumedL" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "idleTimeSeconds" INTEGER NOT NULL DEFAULT 0,
    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hourly_vehicle_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_vehicle_stats" (
    "id" TEXT NOT NULL,
    "vehicleId" VARCHAR(64) NOT NULL,
    "date" DATE NOT NULL,
    "totalDistanceKm" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "avgSpeedKmh" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "maxSpeedKmh" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "fuelConsumedL" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "idleTimeSeconds" INTEGER NOT NULL DEFAULT 0,
    "totalTrips" INTEGER NOT NULL DEFAULT 0,
    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_vehicle_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_trips" (
    "id" TEXT NOT NULL,
    "vehicleId" VARCHAR(64) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "startLatitude" DOUBLE PRECISION NOT NULL,
    "startLongitude" DOUBLE PRECISION NOT NULL,
    "endLatitude" DOUBLE PRECISION,
    "endLongitude" DOUBLE PRECISION,
    "distanceKm" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "avgSpeedKmh" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "maxSpeedKmh" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "fuelConsumedL" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "idleTimeSeconds" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_trips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "processed_events_vehicleId_processedAt_idx" ON "processed_events"("vehicleId", "processedAt");

-- CreateIndex
CREATE INDEX "hourly_vehicle_stats_bucketStart_idx" ON "hourly_vehicle_stats"("bucketStart");

-- CreateIndex
CREATE INDEX "hourly_vehicle_stats_vehicleId_idx" ON "hourly_vehicle_stats"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "hourly_vehicle_stats_vehicleId_bucketStart_key" ON "hourly_vehicle_stats"("vehicleId", "bucketStart");

-- CreateIndex
CREATE INDEX "daily_vehicle_stats_date_idx" ON "daily_vehicle_stats"("date");

-- CreateIndex
CREATE INDEX "daily_vehicle_stats_vehicleId_idx" ON "daily_vehicle_stats"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "daily_vehicle_stats_vehicleId_date_key" ON "daily_vehicle_stats"("vehicleId", "date");

-- CreateIndex
CREATE INDEX "vehicle_trips_vehicleId_startTime_idx" ON "vehicle_trips"("vehicleId", "startTime");

-- CreateIndex
CREATE INDEX "vehicle_trips_status_idx" ON "vehicle_trips"("status");
