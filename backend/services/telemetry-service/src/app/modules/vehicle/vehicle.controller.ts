import type { Request, Response } from "express";
import { catchAsync, pick, sendResponse } from "@vehicle-pulse/shared";
import { VehicleService } from "./vehicle.service.js";
import { vehicleFilterableFields, paginationFields } from "./vehicle.constant.js";

const createVehicle = catchAsync(async (req: Request, res: Response) => {
  const result = await VehicleService.createVehicle(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Vehicle created successfully",
    data: result,
  });
});

const getAllVehicles = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, vehicleFilterableFields);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await VehicleService.getAllVehicles(filters, paginationOptions);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Vehicles retrieved successfully",
    meta: result.meta,
    data: result.data,
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

const updateVehicle = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await VehicleService.updateVehicle(id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Vehicle updated successfully",
    data: result,
  });
});

const deleteVehicle = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await VehicleService.deleteVehicle(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Vehicle deleted successfully",
    data: result,
  });
});

export const VehicleController = {
  createVehicle,
  getAllVehicles,
  getSingleVehicle,
  updateVehicle,
  deleteVehicle,
};
