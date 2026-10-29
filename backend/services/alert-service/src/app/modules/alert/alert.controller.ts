import type { Request, Response } from "express";
import { catchAsync, sendResponse } from "@vehicle-pulse/shared";
import { AlertService } from "./alert.service.js";

const listAlerts = catchAsync(async (req: Request, res: Response) => {
  const result = await AlertService.listAlerts({
    vehicleId: req.query.vehicleId as string | undefined,
    status: req.query.status as any,
    severity: req.query.severity as any,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    offset: req.query.offset ? Number(req.query.offset) : undefined,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Alerts retrieved successfully",
    data: result,
  });
});

const getAlertById = catchAsync(async (req: Request, res: Response) => {
  const alert = await AlertService.getAlertById(req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Alert details retrieved",
    data: alert,
  });
});

const createAlert = catchAsync(async (req: Request, res: Response) => {
  const alert = await AlertService.createAlert(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Alert created successfully",
    data: alert,
  });
});

const acknowledgeAlert = catchAsync(async (req: Request, res: Response) => {
  const alert = await AlertService.acknowledgeAlert(req.params.id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Alert acknowledged successfully",
    data: alert,
  });
});

const resolveAlert = catchAsync(async (req: Request, res: Response) => {
  const alert = await AlertService.resolveAlert(req.params.id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Alert resolved successfully",
    data: alert,
  });
});

export const AlertController = {
  listAlerts,
  getAlertById,
  createAlert,
  acknowledgeAlert,
  resolveAlert,
};
