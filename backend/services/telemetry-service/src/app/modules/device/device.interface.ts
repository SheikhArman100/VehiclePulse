import { z } from "zod";

export const deviceStatusEnum = ["online", "offline", "unpaired"] as const;
export type IDeviceStatus = (typeof deviceStatusEnum)[number];

export type IDevice = {
  deviceId: string;
  serialNumber: string;
  firmwareVersion: string;
  status: IDeviceStatus;
  vehicleId?: string;
  lastHeartbeat?: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

export const deviceFilterableFields = [
  "searchTerm",
  "deviceId",
  "status",
  "vehicleId",
];

export const DeviceValidations = {
  createDeviceZodSchema: z.object({
    body: z.object({
      deviceId: z.string({ required_error: "Device ID is required" }).min(3),
      serialNumber: z.string({ required_error: "Serial number is required" }).min(3),
      firmwareVersion: z.string().default("v1.0.0"),
      status: z.enum(deviceStatusEnum).default("unpaired"),
      vehicleId: z.string().optional(),
    }),
  }),

  updateDeviceZodSchema: z.object({
    body: z.object({
      firmwareVersion: z.string().optional(),
      status: z.enum(deviceStatusEnum).optional(),
      vehicleId: z.string().optional(),
    }),
  }),
};
