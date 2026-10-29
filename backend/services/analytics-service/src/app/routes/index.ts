import express from "express";
import { MetricsRoutes } from "../modules/metrics/metrics.route.js";
import { TripRoutes } from "../modules/trip/trip.route.js";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/",
    route: MetricsRoutes,
  },
  {
    path: "/trips",
    route: TripRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export const ApplicationRouters = router;
