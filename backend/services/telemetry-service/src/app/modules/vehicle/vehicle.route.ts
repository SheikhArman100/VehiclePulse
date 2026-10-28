import express from "express";
import { VehicleController } from "./vehicle.controller.js";

const router = express.Router();

router.get("/", VehicleController.getAllVehicles);
router.get("/:id", VehicleController.getSingleVehicle);

export const VehicleRoutes = router;
