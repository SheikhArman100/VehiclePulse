import express from "express";
import { VehicleRoutes } from "../modules/vehicle/vehicle.route.js";
import { DeviceRoutes } from "../modules/device/device.route.js";
import { TelemetryRoutes } from "../modules/telemetry/telemetry.route.js";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/vehicles",
    route: VehicleRoutes,
  },
  {
    path: "/devices",
    route: DeviceRoutes,
  },
  {
    path: "/telemetry",
    route: TelemetryRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export const ApplicationRouters = router;
