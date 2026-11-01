import type { Request, Response } from "express";
import { catchAsync, sendResponse, AppError } from "@vehicle-pulse/shared";
import { getGeoService, getCacheService, getStateService } from "../../kafka/redisStateConsumer.js";

/**
 * Controller: Find nearby vehicles within a radius (Phase 22 Redis GEO)
 * GET /api/telemetry/v1/vehicles/nearby?lat=...&lng=...&radiusKm=...&limit=...
 */
export const findNearbyVehicles = catchAsync(async (req: Request, res: Response) => {
  const geoService = getGeoService();
  if (!geoService) {
    throw new AppError("Geospatial service is not initialized", 503);
  }

  const latStr = req.query.lat as string;
  const lngStr = req.query.lng as string;
  const radiusKmStr = (req.query.radiusKm as string) || "10";
  const limitStr = (req.query.limit as string) || "20";

  if (!latStr || !lngStr) {
    throw new AppError("Query parameters 'lat' and 'lng' are required numbers", 400);
  }

  const latitude = parseFloat(latStr);
  const longitude = parseFloat(lngStr);
  const radiusKm = parseFloat(radiusKmStr);
  const limit = parseInt(limitStr, 10);

  if (isNaN(latitude) || isNaN(longitude) || isNaN(radiusKm) || isNaN(limit)) {
    throw new AppError("Parameters 'lat', 'lng', 'radiusKm', and 'limit' must be valid numbers", 400);
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new AppError("Invalid latitude [-90, 90] or longitude [-180, 180]", 400);
  }

  // 1. Query Redis Geospatial Index via GEOSEARCH
  const nearbyVehicles = await geoService.findNearby(longitude, latitude, radiusKm, limit);

  // 2. Enrich with vehicle real-time state if available (speed, status, etc.)
  const stateService = getStateService();
  let enrichedResults = nearbyVehicles as Array<any>;

  if (stateService && nearbyVehicles.length > 0) {
    const ids = nearbyVehicles.map((v) => v.vehicleId);
    const states = await stateService.getMultipleVehicleStates(ids);

    enrichedResults = nearbyVehicles.map((v) => {
      const state = states[v.vehicleId];
      return {
        ...v,
        status: state?.status || "UNKNOWN",
        isOnline: state?.isOnline ?? false,
        speed: state?.latestTelemetry?.speed ?? 0,
        fuelPercent: state?.latestTelemetry?.fuelLevelPercent,
        batteryVoltage: state?.latestTelemetry?.batteryVoltage,
        lastSeen: state?.lastSeen,
      };
    });
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `Found ${nearbyVehicles.length} vehicles within ${radiusKm} km radius`,
    meta: {
      total: nearbyVehicles.length,
      limit,
    },
    data: enrichedResults,
  });
});

/**
 * Controller: Get Cache Metrics (Phase 22)
 * GET /api/telemetry/v1/vehicles/cache/metrics
 */
export const getCacheMetrics = catchAsync(async (_req: Request, res: Response) => {
  const cacheService = getCacheService();
  if (!cacheService) {
    throw new AppError("Cache service is not initialized", 503);
  }

  const metrics = cacheService.getMetrics();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Cache metrics retrieved successfully",
    data: metrics,
  });
});
