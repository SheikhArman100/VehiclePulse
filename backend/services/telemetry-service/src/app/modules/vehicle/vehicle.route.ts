import express from "express";
import { validateRequest } from "@vehicle-pulse/shared";
import { VehicleController } from "./vehicle.controller.js";
import { VehicleValidations } from "./vehicle.interface.js";

const router = express.Router();

router.post(
  "/",
  validateRequest(VehicleValidations.createVehicleZodSchema),
  VehicleController.createVehicle
);

router.get("/", VehicleController.getAllVehicles);
router.get("/:id", VehicleController.getSingleVehicle);

router.patch(
  "/:id",
  validateRequest(VehicleValidations.updateVehicleZodSchema),
  VehicleController.updateVehicle
);

router.delete("/:id", VehicleController.deleteVehicle);

export const VehicleRoutes = router;
