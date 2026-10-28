import {
  calculatePagination,
  NotFoundError,
  type IPaginationOptions,
} from "@vehicle-pulse/shared";
import type { SortOrder } from "mongoose";
import type { IVehicle, IVehicleFilters } from "./vehicle.interface.js";
import { Vehicle } from "./vehicle.model.js";

const createVehicle = async (payload: IVehicle): Promise<IVehicle> => {
  const result = await Vehicle.create(payload);
  return result.toJSON();
};

const getAllVehicles = async (
  filters: IVehicleFilters,
  paginationOptions: IPaginationOptions
): Promise<{
  meta: { page: number; limit: number; total: number };
  data: IVehicle[];
}> => {
  const { searchTerm, ...filtersData } = filters;
  const { page, limit, skip, sortBy, sortOrder } =
    calculatePagination(paginationOptions);

  const andConditions: Record<string, unknown>[] = [];

  // Search term condition across make, model, licensePlate
  if (searchTerm) {
    andConditions.push({
      $or: ["make", "model", "licensePlate", "vehicleId"].map((field) => ({
        [field]: {
          $regex: searchTerm,
          $options: "i",
        },
      })),
    });
  }

  // Exact match filters
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

  const result = await Vehicle.find(whereConditions)
    .sort(sortConditions)
    .skip(skip)
    .limit(limit);

  const total = await Vehicle.countDocuments(whereConditions);

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result.map((doc) => doc.toJSON()),
  };
};

const getSingleVehicle = async (vehicleId: string): Promise<IVehicle> => {
  const result = await Vehicle.findOne({ vehicleId });
  if (!result) {
    throw new NotFoundError(`Vehicle with id '${vehicleId}' not found`);
  }
  return result.toJSON();
};

const updateVehicle = async (
  vehicleId: string,
  payload: Partial<IVehicle>
): Promise<IVehicle> => {
  const isExist = await Vehicle.findOne({ vehicleId });
  if (!isExist) {
    throw new NotFoundError(`Vehicle with id '${vehicleId}' not found`);
  }

  const result = await Vehicle.findOneAndUpdate({ vehicleId }, payload, {
    returnDocument: "after",
    runValidators: true,
  });

  return result!.toJSON();
};

const deleteVehicle = async (vehicleId: string): Promise<IVehicle> => {
  const result = await Vehicle.findOneAndDelete({ vehicleId });
  if (!result) {
    throw new NotFoundError(`Vehicle with id '${vehicleId}' not found`);
  }
  return result.toJSON();
};

export const VehicleService = {
  createVehicle,
  getAllVehicles,
  getSingleVehicle,
  updateVehicle,
  deleteVehicle,
};
