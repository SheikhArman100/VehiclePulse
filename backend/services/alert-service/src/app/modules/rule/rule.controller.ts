import type { Request, Response } from "express";
import { catchAsync, sendResponse } from "@vehicle-pulse/shared";
import { RuleService } from "./rule.service.js";

const listRules = catchAsync(async (_req: Request, res: Response) => {
  const rules = await RuleService.listRules();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Alert rules retrieved",
    data: rules,
  });
});

const createRule = catchAsync(async (req: Request, res: Response) => {
  const rule = await RuleService.createRule(req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Alert rule created",
    data: rule,
  });
});

const getRuleById = catchAsync(async (req: Request, res: Response) => {
  const rule = await RuleService.getRuleById(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Alert rule details retrieved",
    data: rule,
  });
});

export const RuleController = {
  listRules,
  createRule,
  getRuleById,
};
