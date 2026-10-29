import { Router, type Request, type Response } from "express";
import { catchAsync, sendResponse } from "@vehicle-pulse/shared";
import { getPrismaClient } from "../db/prisma.js";


const router = Router();

/**
 * GET /api/analytics/v1/summary
 * Returns overall fleet rollups (total processed events, distinct vehicles, total trips).
 */
router.get(
  "/summary",
  catchAsync(async (_req: Request, res: Response) => {
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

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Fleet analytics summary retrieved",
      data: {
        totalProcessedEvents: totalEvents,
        trackedVehiclesCount: distinctVehiclesResult.length,
        totalTripsCount: totalTrips,
        activeTripsCount: activeTrips,
      },
    });
  })
);

/**
 * GET /api/analytics/v1/vehicles/:vehicleId/hourly
 * Returns hourly statistics for a given vehicle within a time range.
 */
router.get(
  "/vehicles/:vehicleId/hourly",
  catchAsync(async (req: Request, res: Response) => {
    const prisma = getPrismaClient();
    const { vehicleId } = req.params;
    const { from, to, limit = "48" } = req.query;

    const where: any = { vehicleId };
    if (from || to) {
      where.bucketStart = {};
      if (from) where.bucketStart.gte = new Date(String(from));
      if (to) where.bucketStart.lte = new Date(String(to));
    }

    const hourlyStats = await prisma.hourlyVehicleStat.findMany({
      where,
      orderBy: { bucketStart: "desc" },
      take: Math.min(Number(limit) || 48, 168),
    });

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: `Hourly statistics for vehicle ${vehicleId} retrieved`,
      data: {
        vehicleId,
        count: hourlyStats.length,
        stats: hourlyStats,
      },
    });
  })
);

/**
 * GET /api/analytics/v1/vehicles/:vehicleId/daily
 * Returns daily rollups for a given vehicle.
 */
router.get(
  "/vehicles/:vehicleId/daily",
  catchAsync(async (req: Request, res: Response) => {
    const prisma = getPrismaClient();
    const { vehicleId } = req.params;
    const { from, to, limit = "30" } = req.query;

    const where: any = { vehicleId };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(String(from));
      if (to) where.date.lte = new Date(String(to));
    }

    const dailyStats = await prisma.dailyVehicleStat.findMany({
      where,
      orderBy: { date: "desc" },
      take: Math.min(Number(limit) || 30, 90),
    });

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: `Daily statistics for vehicle ${vehicleId} retrieved`,
      data: {
        vehicleId,
        count: dailyStats.length,
        stats: dailyStats,
      },
    });
  })
);

/**
 * GET /api/analytics/v1/vehicles/:vehicleId/trips
 * Returns trip history for a given vehicle.
 */
router.get(
  "/vehicles/:vehicleId/trips",
  catchAsync(async (req: Request, res: Response) => {
    const prisma = getPrismaClient();
    const { vehicleId } = req.params;
    const { status, limit = "20" } = req.query;

    const where: any = { vehicleId };
    if (status) {
      where.status = String(status).toUpperCase();
    }

    const trips = await prisma.vehicleTrip.findMany({
      where,
      orderBy: { startTime: "desc" },
      take: Math.min(Number(limit) || 20, 100),
    });

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: `Trips for vehicle ${vehicleId} retrieved`,
      data: {
        vehicleId,
        count: trips.length,
        trips,
      },
    });
  })
);

export const analyticsRouter = router;
