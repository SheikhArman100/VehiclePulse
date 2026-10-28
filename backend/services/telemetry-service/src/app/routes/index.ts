import express from "express";
import { VehicleRoutes } from "../modules/vehicle/vehicle.route.js";
import { DeviceRoutes } from "../modules/device/device.route.js";

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
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export const ApplicationRouters = router;
