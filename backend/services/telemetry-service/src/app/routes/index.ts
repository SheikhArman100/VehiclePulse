import express from "express";
import { VehicleRoutes } from "../modules/vehicle/vehicle.route.js";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/vehicles",
    route: VehicleRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export const ApplicationRouters = router;
