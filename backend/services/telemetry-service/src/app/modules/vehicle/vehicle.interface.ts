import { z } from "zod";

export const vehicleStatusEnum = ["active", "inactive", "maintenance"] as const;

export type IVehicleStatus = (typeof vehicleStatusEnum)[number];

export type IVehicle = {
  vehicleId: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  status: IVehicleStatus;
  deviceId?: string;
  fuelType?: "gasoline" | "diesel" | "electric" | "hybrid";
  createdAt?: Date;
  updatedAt?: Date;
};

export type IVehicleFilters = {
  searchTerm?: string;
  vehicleId?: string;
  status?: IVehicleStatus;
  make?: string;
  model?: string;
};

export const VehicleValidations = {
  createVehicleZodSchema: z.object({
    body: z.object({
      vehicleId: z.string({ required_error: "Vehicle ID is required" }).min(3),
      vin: z.string({ required_error: "VIN is required" }).length(17),
      make: z.string({ required_error: "Make is required" }).min(2),
      model: z.string({ required_error: "Model is required" }).min(1),
      year: z.number({ required_error: "Year is required" }).min(1900).max(2100),
      licensePlate: z.string({ required_error: "License plate is required" }).min(2),
      status: z.enum(vehicleStatusEnum).default("active"),
      deviceId: z.string().optional(),
      fuelType: z.enum(["gasoline", "diesel", "electric", "hybrid"]).optional(),
    }),
  }),

  updateVehicleZodSchema: z.object({
    body: z.object({
      make: z.string().min(2).optional(),
      model: z.string().min(1).optional(),
      year: z.number().min(1900).max(2100).optional(),
      licensePlate: z.string().min(2).optional(),
      status: z.enum(vehicleStatusEnum).optional(),
      deviceId: z.string().optional(),
      fuelType: z.enum(["gasoline", "diesel", "electric", "hybrid"]).optional(),
    }),
  }),
};
