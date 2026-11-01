import type { Request, Response } from "express";
import { catchAsync, sendResponse, AppError } from "@vehicle-pulse/shared";
import { TelemetryRedisStateConsumer } from "../../kafka/redisStateConsumer.js";

/**
 * Controller for Real-Time Vehicle State stored in Redis
 */
export const getVehicleRealtimeState = catchAsync(async (req: Request, res: Response) => {
  const vehicleId = req.params.id;
  const stateService = TelemetryRedisStateConsumer.getStateService();

  if (!stateService) {
    throw new AppError("Redis State Service unavailable or initializing", 503);
  }

  const state = await stateService.getVehicleState(vehicleId);
  if (!state) {
    throw new AppError(`No real-time state found for vehicle '${vehicleId}'`, 404);
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `Real-time state for vehicle ${vehicleId} retrieved from Redis cache`,
    data: state,
  });
});
