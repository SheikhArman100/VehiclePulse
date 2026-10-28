import type { Request, Response } from "express";
import { catchAsync, pick, sendResponse } from "@vehicle-pulse/shared";
import { DeviceService } from "./device.service.js";
import { deviceFilterableFields } from "./device.interface.js";
import { paginationFields } from "../vehicle/vehicle.constant.js";

const createDevice = catchAsync(async (req: Request, res: Response) => {
  const result = await DeviceService.createDevice(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Device created successfully",
    data: result,
  });
});

const getAllDevices = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, deviceFilterableFields);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await DeviceService.getAllDevices(filters, paginationOptions);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Devices retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getSingleDevice = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await DeviceService.getSingleDevice(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Device retrieved successfully",
    data: result,
  });
});

const updateDevice = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await DeviceService.updateDevice(id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Device updated successfully",
    data: result,
  });
});

export const DeviceController = {
  createDevice,
  getAllDevices,
  getSingleDevice,
  updateDevice,
};
