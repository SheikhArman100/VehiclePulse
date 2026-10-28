import express from "express";
import { validateRequest } from "@vehicle-pulse/shared";
import { DeviceController } from "./device.controller.js";
import { DeviceValidations } from "./device.interface.js";

const router = express.Router();

router.post(
  "/",
  validateRequest(DeviceValidations.createDeviceZodSchema),
  DeviceController.createDevice
);

router.get("/", DeviceController.getAllDevices);
router.get("/:id", DeviceController.getSingleDevice);

router.patch(
  "/:id",
  validateRequest(DeviceValidations.updateDeviceZodSchema),
  DeviceController.updateDevice
);

export const DeviceRoutes = router;
