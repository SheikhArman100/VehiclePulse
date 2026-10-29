import express from "express";
import { TripController } from "./trip.controller.js";

const router = express.Router();

router.get("/active", TripController.getActiveTrips);
router.get("/vehicles/:vehicleId", TripController.getVehicleTrips);
router.get("/vehicles/:vehicleId/trips", TripController.getVehicleTrips);

export const TripRoutes = router;

