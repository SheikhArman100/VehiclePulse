import type { Request, Response } from "express";
import { catchAsync, sendResponse } from "@vehicle-pulse/shared";
import { VehicleService } from "./vehicle.service.js";

const getAllVehicles = catchAsync(async (_req: Request, res: Response) => {
  const result = await VehicleService.getAllVehicles();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Vehicles retrieved successfully",
    meta: {
      count: result.length,
    },
    data: result,
  });
});

const getSingleVehicle = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await VehicleService.getSingleVehicle(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Vehicle retrieved successfully",
    data: result,
  });
});

export const VehicleController = {
  getAllVehicles,
  getSingleVehicle,
};
