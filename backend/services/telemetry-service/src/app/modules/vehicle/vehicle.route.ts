import express from "express";
import { validateRequest } from "@vehicle-pulse/shared";
import { VehicleController } from "./vehicle.controller.js";
import { VehicleValidations } from "./vehicle.interface.js";
import { DispatchCommandValidation, dispatchVehicleCommand } from "./command.controller.js";
import { getVehicleRealtimeState } from "./state.controller.js";
import { findNearbyVehicles, getCacheMetrics } from "./geo.controller.js";

const router = express.Router();

router.post(
  "/",
  validateRequest(VehicleValidations.createVehicleZodSchema),
  VehicleController.createVehicle
);

// Redis GEO Nearby Search & Cache Metrics (Phase 22)
router.get("/nearby", findNearbyVehicles);
router.get("/cache/metrics", getCacheMetrics);

router.get("/", VehicleController.getAllVehicles);
router.get("/:id", VehicleController.getSingleVehicle);

router.patch(
  "/:id",
  validateRequest(VehicleValidations.updateVehicleZodSchema),
  VehicleController.updateVehicle
);

router.delete("/:id", VehicleController.deleteVehicle);

// Real-Time Vehicle State from Redis (Phase 21)
router.get("/:id/state", getVehicleRealtimeState);

import { getRedisWrapper } from "../../kafka/redisStateConsumer.js";
import { createRateLimiterMiddleware } from "@vehicle-pulse/shared";

// Sliding window rate limiter for vehicle commands: max 5 commands per 10 seconds per client
const commandRateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const redisWrapper = getRedisWrapper();
  if (!redisWrapper) {
    return next();
  }
  const middleware = createRateLimiterMiddleware(redisWrapper.getClient(), {
    windowMs: 10000, // 10 seconds
    max: 5, // 5 requests
    prefix: "vp:rl:commands:",
  });
  return middleware(req, res, next);
};

// Asynchronous Vehicle Command Dispatch via RabbitMQ with Rate Limiting & Distributed Lock
router.post(
  "/:id/commands",
  commandRateLimiter,
  validateRequest(DispatchCommandValidation),
  dispatchVehicleCommand
);

export const VehicleRoutes = router;

