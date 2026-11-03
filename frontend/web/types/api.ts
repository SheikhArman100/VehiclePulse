import { z } from "zod";

/**
 * Standard API error structure from @vehicle-pulse/shared
 */
export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  errorMessages?: Array<{ path: string; message: string }>;
  stack?: string;
  correlationId?: string;
}

/**
 * Standard API success response structure
 */
export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPage?: number;
  };
}

/**
 * Vehicle Domain Models
 */
export interface Vehicle {
  _id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
  createdAt: string;
  updatedAt: string;
}

export interface Device {
  _id: string;
  deviceId: string;
  vehicleId: string;
  imei: string;
  firmwareVersion: string;
  status: "ACTIVE" | "INACTIVE" | "DECOMMISSIONED";
  lastHeartbeat?: string;
}

export interface VehicleRealtimeState {
  vehicleId: string;
  status: "ONLINE" | "OFFLINE";
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
    heading: number;
    altitudeMeters?: number;
  };
  metrics: {
    speedKmh: number;
    fuelLevelPct: number;
    batteryLevelPct: number;
    engineTempC: number;
    odometerKm: number;
  };
  lastSeenAgoSeconds: number;
}

export interface VehicleTelemetryPoint {
  _id: string;
  timestamp: string;
  metadata: {
    vehicleId: string;
    deviceId: string;
  };
  location: {
    type: "Point";
    coordinates: [number, number]; // [lon, lat]
  };
  speedKmh: number;
  fuelLevelPct: number;
  batteryLevelPct: number;
  engineTempC: number;
  odometerKm: number;
}

/**
 * Analytics Domain Models
 */
export interface FleetAnalyticsSummary {
  totalActiveVehicles: number;
  totalTripsCompleted: number;
  totalDistanceTraveledKm: number;
  fleetAverageSpeedKmh: number;
  fleetAverageFuelEconomyKmpl?: number;
  computedAt: string;
}

export interface HourlyFleetRollup {
  id: string;
  bucketHour: string;
  vehicleId: string;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  distanceDeltaKm: number;
  eventsCount: number;
}

/**
 * Alert Domain Models
 */
export interface AlertIncident {
  id: string;
  ruleCode: string;
  vehicleId: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  summary: string;
  firstTriggeredAt: string;
  lastTriggeredAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  eventsCount: number;
}

/**
 * Zod Schemas for runtime safety
 */
export const VehicleSchema = z.object({
  _id: z.string(),
  vin: z.string(),
  make: z.string(),
  model: z.string(),
  year: z.number(),
  licensePlate: z.string(),
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

