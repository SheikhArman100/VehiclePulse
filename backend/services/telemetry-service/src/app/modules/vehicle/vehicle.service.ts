import { NotFoundError } from "@vehicle-pulse/shared";
import type { IVehicle } from "./vehicle.interface.js";

// In-memory placeholder dataset (will be replaced by Mongoose Model in Phase 7)
const vehicleData: IVehicle[] = [
  {
    id: "veh_1001",
    vin: "1HGCR2F83HA001001",
    make: "Tesla",
    model: "Model 3",
    year: 2024,
    status: "active",
  },
  {
    id: "veh_1002",
    vin: "1HGCR2F83HA001002",
    make: "Ford",
    model: "F-150 Lightning",
    year: 2023,
    status: "active",
  },
];

const getAllVehicles = async (): Promise<IVehicle[]> => {
  return [...vehicleData];
};

const getSingleVehicle = async (id: string): Promise<IVehicle> => {
  const result = vehicleData.find((v) => v.id === id);
  if (!result) {
    throw new NotFoundError(`Vehicle with id '${id}' not found`);
  }
  return result;
};

export const VehicleService = {
  getAllVehicles,
  getSingleVehicle,
};
