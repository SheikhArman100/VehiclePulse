import express from "express";
import { validateRequest } from "@vehicle-pulse/shared";
import { TelemetryController } from "./telemetry.controller.js";
import { TelemetryQueryValidations } from "./telemetry.interface.js";

const router = express.Router();

router.post("/", TelemetryController.recordTelemetry);

router.get(
  "/history",
  validateRequest(TelemetryQueryValidations.historyQuerySchema),
  TelemetryController.getVehicleHistory
);

router.get(
  "/nearby",
  validateRequest(TelemetryQueryValidations.nearbyQuerySchema),
  TelemetryController.findNearbyTelemetry
);

router.get("/latest/:vehicleId", TelemetryController.getLatestVehicleTelemetry);

router.get("/stats/hourly/:vehicleId", TelemetryController.getVehicleHourlyStats);

export const TelemetryRoutes = router;
