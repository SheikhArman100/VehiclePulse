import type { Request, Response } from "express";
import { catchAsync, sendResponse } from "@vehicle-pulse/shared";
import { MetricsService } from "./metrics.service.js";

const getFleetSummary = catchAsync(async (_req: Request, res: Response) => {
  const result = await MetricsService.getFleetSummary();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Fleet analytics summary retrieved",
    data: result,
  });
});

const getVehicleHourlyStats = catchAsync(async (req: Request, res: Response) => {
  const { vehicleId } = req.params;
  const { from, to, limit } = req.query;

  const result = await MetricsService.getVehicleHourlyStats(vehicleId, {
    from: from ? String(from) : undefined,
    to: to ? String(to) : undefined,
    limit: limit ? Number(limit) : undefined,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `Hourly statistics for vehicle ${vehicleId} retrieved`,
    data: result,
  });
});

const getVehicleDailyStats = catchAsync(async (req: Request, res: Response) => {
  const { vehicleId } = req.params;
  const { from, to, limit } = req.query;

  const result = await MetricsService.getVehicleDailyStats(vehicleId, {
    from: from ? String(from) : undefined,
    to: to ? String(to) : undefined,
    limit: limit ? Number(limit) : undefined,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `Daily statistics for vehicle ${vehicleId} retrieved`,
    data: result,
  });
});

const getVehiclePerformanceRankings = catchAsync(async (req: Request, res: Response) => {
  const { vehicleId } = req.params;
  const limit = Math.min(Number(req.query.limit) || 10, 50);

  const result = await MetricsService.getVehiclePerformanceRankings(vehicleId, limit);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `Performance rankings and moving averages for vehicle ${vehicleId} retrieved`,
    data: result,
  });
});

const getFleetDailyRollups = catchAsync(async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 30, 90);

  const result = await MetricsService.getFleetDailyRollups(limit);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Pre-computed fleet daily KPIs retrieved from Materialized View",
    data: result,
  });
});

export const MetricsController = {
  getFleetSummary,
  getVehicleHourlyStats,
  getVehicleDailyStats,
  getVehiclePerformanceRankings,
  getFleetDailyRollups,
};
