import type { Request, Response } from "express";
import { catchAsync, sendResponse } from "@vehicle-pulse/shared";
import { TelemetryService } from "./telemetry.service.js";

const recordTelemetry = catchAsync(async (req: Request, res: Response) => {
  const result = await TelemetryService.recordTelemetry(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Telemetry point recorded successfully",
    data: result,
  });
});

const getVehicleHistory = catchAsync(async (req: Request, res: Response) => {
  const { vehicleId, from, to, page, limit } = req.query as Record<string, string>;

  const result = await TelemetryService.getVehicleHistory({
    vehicleId,
    from,
    to,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 50,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Vehicle telemetry history retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getLatestVehicleTelemetry = catchAsync(async (req: Request, res: Response) => {
  const { vehicleId } = req.params;
  const result = await TelemetryService.getLatestVehicleTelemetry(vehicleId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result
      ? "Latest telemetry point retrieved successfully"
      : "No telemetry records found for vehicle",
    data: result,
  });
});

const findNearbyTelemetry = catchAsync(async (req: Request, res: Response) => {
  const { longitude, latitude, maxDistanceMeters, limit } = req.query as Record<string, string>;

  const result = await TelemetryService.findNearbyTelemetry({
    longitude: Number(longitude),
    latitude: Number(latitude),
    maxDistanceMeters: maxDistanceMeters ? Number(maxDistanceMeters) : 10000,
    limit: limit ? Number(limit) : 20,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Nearby telemetry points retrieved successfully",
    meta: {
      count: result.length,
    },
    data: result,
  });
});

const getVehicleHourlyStats = catchAsync(async (req: Request, res: Response) => {
  const { vehicleId } = req.params;
  const { from, to } = req.query as Record<string, string>;

  const result = await TelemetryService.getVehicleHourlyStats(
    vehicleId,
    from ? new Date(from) : undefined,
    to ? new Date(to) : undefined
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Vehicle hourly statistics computed successfully",
    data: result,
  });
});

export const TelemetryController = {
  recordTelemetry,
  getVehicleHistory,
  getLatestVehicleTelemetry,
  findNearbyTelemetry,
  getVehicleHourlyStats,
};
