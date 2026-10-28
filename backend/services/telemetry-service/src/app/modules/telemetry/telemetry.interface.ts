import { z } from "zod";

export type IGeoPoint = {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude] in GeoJSON
};

export type ITelemetryRecord = {
  timestamp: Date;
  metadata: {
    vehicleId: string;
    deviceId: string;
    vin?: string;
  };
  location: IGeoPoint;
  heading: number;
  altitude?: number;
  speed: number;
  rpm: number;
  fuelLevelPercent: number;
  engineTemperatureCelsius: number;
  batteryVoltage: number;
  odometerKm: number;
  engineStatus: "ON" | "OFF" | "IDLE";
  accelerationG?: number;
};

export type ITelemetryHistoryQuery = {
  vehicleId: string;
  from?: string; // ISO date string
  to?: string;   // ISO date string
  page?: number;
  limit?: number;
};

export type ITelemetryNearbyQuery = {
  longitude: number;
  latitude: number;
  maxDistanceMeters?: number;
  limit?: number;
};

export const TelemetryQueryValidations = {
  historyQuerySchema: z.object({
    query: z.object({
      vehicleId: z.string({ required_error: "vehicleId query parameter is required" }),
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(1000).default(50),
    }),
  }),

  nearbyQuerySchema: z.object({
    query: z.object({
      longitude: z.coerce.number().min(-180).max(180),
      latitude: z.coerce.number().min(-90).max(90),
      maxDistanceMeters: z.coerce.number().min(1).max(500000).default(10000), // default 10km
      limit: z.coerce.number().min(1).max(100).default(20),
    }),
  }),
};
