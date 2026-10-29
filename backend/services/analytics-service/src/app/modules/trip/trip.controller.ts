import type { Request, Response } from "express";
import { catchAsync, sendResponse } from "@vehicle-pulse/shared";
import { TripService } from "./trip.service.js";

const getActiveTrips = catchAsync(async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const result = await TripService.getActiveTrips(limit);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Active trips retrieved via optimized index-only scan",
    data: result,
  });
});

const getVehicleTrips = catchAsync(async (req: Request, res: Response) => {
  const { vehicleId } = req.params;
  const { status, limit } = req.query;

  const result = await TripService.getVehicleTrips(vehicleId, {
    status: status ? String(status) : undefined,
    limit: limit ? Number(limit) : undefined,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `Trips for vehicle ${vehicleId} retrieved`,
    data: result,
  });
});

export const TripController = {
  getActiveTrips,
  getVehicleTrips,
};
