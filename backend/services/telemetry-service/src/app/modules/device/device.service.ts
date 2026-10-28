import {
  calculatePagination,
  NotFoundError,
  type IPaginationOptions,
} from "@vehicle-pulse/shared";
import type { SortOrder } from "mongoose";
import type { IDevice } from "./device.interface.js";
import { Device } from "./device.model.js";

const createDevice = async (payload: IDevice): Promise<IDevice> => {
  const result = await Device.create(payload);
  return result.toJSON();
};

const getAllDevices = async (
  filters: Record<string, unknown>,
  paginationOptions: IPaginationOptions
): Promise<{
  meta: { page: number; limit: number; total: number };
  data: IDevice[];
}> => {
  const { searchTerm, ...filtersData } = filters;
  const { page, limit, skip, sortBy, sortOrder } =
    calculatePagination(paginationOptions);

  const andConditions: Record<string, unknown>[] = [];

  if (searchTerm) {
    andConditions.push({
      $or: ["deviceId", "serialNumber", "vehicleId"].map((field) => ({
        [field]: {
          $regex: searchTerm,
          $options: "i",
        },
      })),
    });
  }

  if (Object.keys(filtersData).length) {
    andConditions.push({
      $and: Object.entries(filtersData).map(([field, value]) => ({
        [field]: value,
      })),
    });
  }

  const sortConditions: { [key: string]: SortOrder } = {};
  if (sortBy && sortOrder) {
    sortConditions[sortBy] = sortOrder === "asc" ? 1 : -1;
  }

  const whereConditions =
    andConditions.length > 0 ? { $and: andConditions } : {};

  const result = await Device.find(whereConditions)
    .sort(sortConditions)
    .skip(skip)
    .limit(limit);

  const total = await Device.countDocuments(whereConditions);

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result.map((doc) => doc.toJSON()),
  };
};

const getSingleDevice = async (deviceId: string): Promise<IDevice> => {
  const result = await Device.findOne({ deviceId });
  if (!result) {
    throw new NotFoundError(`Device with id '${deviceId}' not found`);
  }
  return result.toJSON();
};

const updateDevice = async (
  deviceId: string,
  payload: Partial<IDevice>
): Promise<IDevice> => {
  const isExist = await Device.findOne({ deviceId });
  if (!isExist) {
    throw new NotFoundError(`Device with id '${deviceId}' not found`);
  }

  const result = await Device.findOneAndUpdate({ deviceId }, payload, {
    returnDocument: "after",
    runValidators: true,
  });

  return result!.toJSON();
};

export const DeviceService = {
  createDevice,
  getAllDevices,
  getSingleDevice,
  updateDevice,
};
