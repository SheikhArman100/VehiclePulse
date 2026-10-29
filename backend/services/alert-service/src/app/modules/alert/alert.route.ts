import { Router } from "express";
import { AlertController } from "./alert.controller.js";

const router = Router();

router.get("/", AlertController.listAlerts);
router.post("/", AlertController.createAlert);
router.get("/consumer/metrics", AlertController.getConsumerMetrics);
router.get("/:id", AlertController.getAlertById);
router.patch("/:id/acknowledge", AlertController.acknowledgeAlert);
router.patch("/:id/resolve", AlertController.resolveAlert);

export const AlertRoutes = router;
