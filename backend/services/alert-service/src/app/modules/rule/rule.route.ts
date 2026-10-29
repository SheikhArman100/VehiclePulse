import { Router } from "express";
import { RuleController } from "./rule.controller.js";

const router = Router();

router.get("/", RuleController.listRules);
router.post("/", RuleController.createRule);
router.get("/:id", RuleController.getRuleById);

export const RuleRoutes = router;
