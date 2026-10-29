import { Router } from "express";
import { AlertRoutes } from "../modules/alert/alert.route.js";
import { RuleRoutes } from "../modules/rule/rule.route.js";

const router = Router();

const moduleRoutes = [
  { path: "/alerts", module: AlertRoutes },
  { path: "/rules", module: RuleRoutes },
];

moduleRoutes.forEach((route) => router.use(route.path, route.module));

export const ApplicationRouters = router;
