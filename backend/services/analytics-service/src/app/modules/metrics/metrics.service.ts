import { getPrismaClient } from "../../db/prisma.js";

const getFleetSummary = async () => {
  const prisma = getPrismaClient();

  const [totalEvents, totalTrips, activeTrips, distinctVehiclesResult] = await Promise.all([
    prisma.processedEvent.count(),
    prisma.vehicleTrip.count(),
    prisma.vehicleTrip.count({ where: { status: "ACTIVE" } }),
    prisma.hourlyVehicleStat.findMany({
      distinct: ["vehicleId"],
      select: { vehicleId: true },
    }),
  ]);

  return {
    totalProcessedEvents: totalEvents,
    trackedVehiclesCount: distinctVehiclesResult.length,
    totalTripsCount: totalTrips,
    activeTripsCount: activeTrips,
  };
};

const getVehicleHourlyStats = async (
  vehicleId: string,
  options: { from?: string; to?: string; limit?: number }
) => {
  const prisma = getPrismaClient();
  const where: any = { vehicleId };

  if (options.from || options.to) {
    where.bucketStart = {};
    if (options.from) where.bucketStart.gte = new Date(options.from);
    if (options.to) where.bucketStart.lte = new Date(options.to);
  }

  const hourlyStats = await prisma.hourlyVehicleStat.findMany({
    where,
    orderBy: { bucketStart: "desc" },
    take: Math.min(options.limit || 48, 168),
  });

  return {
    vehicleId,
    count: hourlyStats.length,
    stats: hourlyStats,
  };
};

const getVehicleDailyStats = async (
  vehicleId: string,
  options: { from?: string; to?: string; limit?: number }
) => {
  const prisma = getPrismaClient();
  const where: any = { vehicleId };

  if (options.from || options.to) {
    where.date = {};
    if (options.from) where.date.gte = new Date(options.from);
    if (options.to) where.date.lte = new Date(options.to);
  }

  const dailyStats = await prisma.dailyVehicleStat.findMany({
    where,
    orderBy: { date: "desc" },
    take: Math.min(options.limit || 30, 90),
  });

  return {
    vehicleId,
    count: dailyStats.length,
    stats: dailyStats,
  };
};

const getVehiclePerformanceRankings = async (vehicleId: string, limit: number = 10) => {
  const prisma = getPrismaClient();

  const performanceRankings = await prisma.$queryRaw<
    Array<{
      vehicleId: string;
      bucketStart: Date;
      avgSpeedKmh: number;
      movingAvgSpeed: number;
      distanceKm: number;
      distanceRank: number;
    }>
  >`
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
      WHERE "vehicleId" = ${vehicleId}
        AND "bucketStart" >= NOW() - interval '30 days'
    )
    SELECT "vehicleId", "bucketStart", "avgSpeedKmh", "movingAvgSpeed", "distanceKm", "distanceRank"
    FROM vehicle_recent_stats
    WHERE "distanceRank" <= 5
    ORDER BY "distanceRank" ASC, "bucketStart" DESC
    LIMIT ${limit}
  `;

  return {
    vehicleId,
    count: performanceRankings.length,
    rankings: performanceRankings,
  };
};

const getFleetDailyRollups = async (limit: number = 30) => {
  const prisma = getPrismaClient();

  const rawRollups = await prisma.$queryRaw<
    Array<{
      statDate: Date;
      activeVehicles: number;
      totalFleetDistanceKm: number;
      fleetAvgSpeedKmh: number;
      peakSpeedKmh: number;
      totalFleetIdleSeconds: number;
      totalFleetEvents: number;
    }>
  >`
    SELECT
      "statDate",
      "activeVehicles"::int AS "activeVehicles",
      "totalFleetDistanceKm"::float AS "totalFleetDistanceKm",
      "fleetAvgSpeedKmh"::float AS "fleetAvgSpeedKmh",
      "peakSpeedKmh"::float AS "peakSpeedKmh",
      "totalFleetIdleSeconds"::int AS "totalFleetIdleSeconds",
      "totalFleetEvents"::int AS "totalFleetEvents"
    FROM mv_fleet_daily_summary
    ORDER BY "statDate" DESC
    LIMIT ${limit}
  `;

  return {
    count: rawRollups.length,
    rollups: rawRollups,
  };
};

export const MetricsService = {
  getFleetSummary,
  getVehicleHourlyStats,
  getVehicleDailyStats,
  getVehiclePerformanceRankings,
  getFleetDailyRollups,
};
