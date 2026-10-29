import type { PrismaClient } from "../../generated/client.js";
import type { TelemetryRawEvent } from "@vehicle-pulse/event-contracts";

/**
 * Calculates start and end Date bounds for an hourly bucket given a timestamp.
 */
export function getHourlyBucketBounds(timestamp: Date): { bucketStart: Date; bucketEnd: Date } {
  const bucketStart = new Date(timestamp);
  bucketStart.setMinutes(0, 0, 0);
  const bucketEnd = new Date(bucketStart.getTime() + 60 * 60 * 1000);
  return { bucketStart, bucketEnd };
}

/**
 * Calculates date-only UTC boundary for daily statistics.
 */
export function getDailyDate(timestamp: Date): Date {
  const date = new Date(timestamp);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

/**
 * Persists an incoming TelemetryRawEvent into analytical rollup models inside a single transaction.
 *
 * Guaranteed Properties:
 * 1. Idempotency: Checks `processed_events`. If eventId already processed, returns immediately without double-counting.
 * 2. Hourly Rollup: Upserts `HourlyVehicleStat` computing cumulative metrics and weighted averages.
 * 3. Daily Rollup: Upserts `DailyVehicleStat` aggregating daily statistics.
 * 4. Trip Tracking: Manages `VehicleTrip` lifecycle based on engine status transitions.
 */
export async function processTelemetryEventAggregations(
  prisma: PrismaClient,
  event: TelemetryRawEvent
): Promise<{ processed: boolean; isDuplicate: boolean }> {
  const eventDate = new Date(event.timestamp);
  const { bucketStart, bucketEnd } = getHourlyBucketBounds(eventDate);
  const dailyDate = getDailyDate(eventDate);

  const isIdle = event.data.speed === 0 || event.data.engineStatus === "IDLE";
  const idleSeconds = isIdle ? 1 : 0; // Approximate 1s interval per incoming state event

  return await prisma.$transaction(async (tx) => {
    // 1. Idempotency Check & Lock
    const existing = await tx.processedEvent.findUnique({
      where: { eventId: event.eventId },
    });

    if (existing) {
      return { processed: false, isDuplicate: true };
    }

    // Record processed event
    await tx.processedEvent.create({
      data: {
        eventId: event.eventId,
        eventType: event.eventType,
        vehicleId: event.vehicleId,
        processedAt: eventDate,
      },
    });

    // 2. Hourly Rollup Upsert
    const currentHourly = await tx.hourlyVehicleStat.findUnique({
      where: {
        vehicleId_bucketStart: {
          vehicleId: event.vehicleId,
          bucketStart,
        },
      },
    });

    if (!currentHourly) {
      await tx.hourlyVehicleStat.create({
        data: {
          vehicleId: event.vehicleId,
          bucketStart,
          bucketEnd,
          distanceKm: 0.0,
          avgSpeedKmh: event.data.speed,
          maxSpeedKmh: event.data.speed,
          fuelConsumedL: 0.0,
          idleTimeSeconds: idleSeconds,
          eventCount: 1,
        },
      });
    } else {
      const newEventCount = currentHourly.eventCount + 1;
      const newAvgSpeed =
        (currentHourly.avgSpeedKmh * currentHourly.eventCount + event.data.speed) / newEventCount;
      const newMaxSpeed = Math.max(currentHourly.maxSpeedKmh, event.data.speed);

      await tx.hourlyVehicleStat.update({
        where: { id: currentHourly.id },
        data: {
          eventCount: newEventCount,
          avgSpeedKmh: Math.round(newAvgSpeed * 100) / 100,
          maxSpeedKmh: Math.max(newMaxSpeed, event.data.speed),
          idleTimeSeconds: currentHourly.idleTimeSeconds + idleSeconds,
        },
      });
    }

    // 3. Daily Rollup Upsert
    const currentDaily = await tx.dailyVehicleStat.findUnique({
      where: {
        vehicleId_date: {
          vehicleId: event.vehicleId,
          date: dailyDate,
        },
      },
    });

    if (!currentDaily) {
      await tx.dailyVehicleStat.create({
        data: {
          vehicleId: event.vehicleId,
          date: dailyDate,
          totalDistanceKm: 0.0,
          avgSpeedKmh: event.data.speed,
          maxSpeedKmh: event.data.speed,
          fuelConsumedL: 0.0,
          idleTimeSeconds: idleSeconds,
          totalTrips: 1,
          eventCount: 1,
        },
      });
    } else {
      const newEventCount = currentDaily.eventCount + 1;
      const newAvgSpeed =
        (currentDaily.avgSpeedKmh * currentDaily.eventCount + event.data.speed) / newEventCount;

      await tx.dailyVehicleStat.update({
        where: { id: currentDaily.id },
        data: {
          eventCount: newEventCount,
          avgSpeedKmh: Math.round(newAvgSpeed * 100) / 100,
          maxSpeedKmh: Math.max(currentDaily.maxSpeedKmh, event.data.speed),
          idleTimeSeconds: currentDaily.idleTimeSeconds + idleSeconds,
        },
      });
    }

    // 4. Trip Lifecycle Tracking
    // Find active trip for this vehicle
    const activeTrip = await tx.vehicleTrip.findFirst({
      where: {
        vehicleId: event.vehicleId,
        status: "ACTIVE",
      },
      orderBy: { startTime: "desc" },
    });

    if (event.data.engineStatus === "OFF") {
      if (activeTrip) {
        // Complete the active trip
        await tx.vehicleTrip.update({
          where: { id: activeTrip.id },
          data: {
            status: "COMPLETED",
            endTime: eventDate,
            endLatitude: event.data.location.latitude,
            endLongitude: event.data.location.longitude,
          },
        });
      }
    } else {
      // Engine is ON or IDLE
      if (!activeTrip) {
        // Start a new trip
        await tx.vehicleTrip.create({
          data: {
            vehicleId: event.vehicleId,
            startTime: eventDate,
            startLatitude: event.data.location.latitude,
            startLongitude: event.data.location.longitude,
            status: "ACTIVE",
            avgSpeedKmh: event.data.speed,
            maxSpeedKmh: event.data.speed,
            idleTimeSeconds: idleSeconds,
          },
        });
      } else {
        // Update active trip
        const newMaxSpeed = Math.max(activeTrip.maxSpeedKmh, event.data.speed);
        await tx.vehicleTrip.update({
          where: { id: activeTrip.id },
          data: {
            endLatitude: event.data.location.latitude,
            endLongitude: event.data.location.longitude,
            maxSpeedKmh: newMaxSpeed,
            idleTimeSeconds: activeTrip.idleTimeSeconds + idleSeconds,
          },
        });
      }
    }

    return { processed: true, isDuplicate: false };
  });
}
