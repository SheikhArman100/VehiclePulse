import express from "express";
import { MetricsController } from "./metrics.controller.js";
import { TripController } from "../trip/trip.controller.js";

const router = express.Router();

router.get("/summary", MetricsController.getFleetSummary);
router.get("/fleet/daily-rollups", MetricsController.getFleetDailyRollups);
router.get("/vehicles/:vehicleId/hourly", MetricsController.getVehicleHourlyStats);
router.get("/vehicles/:vehicleId/daily", MetricsController.getVehicleDailyStats);
router.get("/vehicles/:vehicleId/rankings", MetricsController.getVehiclePerformanceRankings);
router.get("/vehicles/:vehicleId/trips", TripController.getVehicleTrips);

export const MetricsRoutes = router;

