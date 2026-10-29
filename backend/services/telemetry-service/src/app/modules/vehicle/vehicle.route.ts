import express from "express";
import { validateRequest } from "@vehicle-pulse/shared";
import { VehicleController } from "./vehicle.controller.js";
import { VehicleValidations } from "./vehicle.interface.js";
import { DispatchCommandValidation, dispatchVehicleCommand } from "./command.controller.js";

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

// Asynchronous Vehicle Command Dispatch via RabbitMQ
router.post(
  "/:id/commands",
  validateRequest(DispatchCommandValidation),
  dispatchVehicleCommand
);

export const VehicleRoutes = router;
