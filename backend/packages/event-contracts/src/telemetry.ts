import { z } from "zod";
import { createEventEnvelopeSchema } from "./envelope.js";

/**
 * Units & Conventions:
 * - coordinates: WGS84 latitude (-90 to 90), longitude (-180 to 180)
 * - speed: km/h (0 to 300)
 * - heading: degrees (0 to 359.99)
 * - altitude: meters above sea level (-500 to 9000)
 * - rpm: revolutions per minute (0 to 12000)
 * - fuelLevelPercent: percentage (0 to 100)
 * - engineTemperatureCelsius: degrees Celsius (-40 to 160)
 * - batteryVoltage: volts (0 to 36)
 * - odometerKm: total distance in km (>= 0)
 * - engineStatus: "ON" | "OFF" | "IDLE"
 */
export const TelemetryDataSchema = z.object({
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    heading: z.number().min(0).max(360).default(0),
    altitude: z.number().min(-500).max(9000).optional(),
  }),
  speed: z.number().min(0).max(300),
  rpm: z.number().int().min(0).max(12000),
  fuelLevelPercent: z.number().min(0).max(100),
  engineTemperatureCelsius: z.number().min(-40).max(160),
  batteryVoltage: z.number().min(0).max(36),
  odometerKm: z.number().min(0),
  engineStatus: z.enum(["ON", "OFF", "IDLE"]).default("ON"),
  accelerationG: z.number().min(-5).max(5).optional(), // G-force (negative = braking)
});

export type TelemetryData = z.infer<typeof TelemetryDataSchema>;

/**
 * Raw Telemetry Event Contract
 */
export const TelemetryRawEventSchema = createEventEnvelopeSchema(TelemetryDataSchema).extend({
  eventType: z.literal("telemetry.raw"),
});

export type TelemetryRawEvent = z.infer<typeof TelemetryRawEventSchema>;

/**
 * Fast-path validator for canonical TelemetryRawEvent.
 * Avoids Zod regex & full recursive schema traversal for high-throughput batch ingest paths.
 */
export function fastValidateTelemetryRawEvent(event: any): { success: true; data: TelemetryRawEvent } | { success: false; error: string } {
  if (!event || typeof event !== "object") {
    return { success: false, error: "Payload must be an object" };
  }

  // 1. Envelope fields
  if (typeof event.eventId !== "string" || event.eventId.length < 10) {
    return { success: false, error: "Invalid or missing eventId" };
  }
  if (event.eventType !== "telemetry.raw") {
    return { success: false, error: `Invalid eventType: expected 'telemetry.raw', received '${event.eventType}'` };
  }
  if (typeof event.vehicleId !== "string" || !event.vehicleId) {
    return { success: false, error: "Invalid or missing vehicleId" };
  }
  if (typeof event.deviceId !== "string" || !event.deviceId) {
    return { success: false, error: "Invalid or missing deviceId" };
  }
  if (typeof event.timestamp !== "string" || !event.timestamp) {
    return { success: false, error: "Invalid or missing timestamp" };
  }

  // 2. Data payload
  const d = event.data;
  if (!d || typeof d !== "object") {
    return { success: false, error: "Missing or invalid data payload" };
  }

  // Location
  const loc = d.location;
  if (!loc || typeof loc !== "object") {
    return { success: false, error: "Missing or invalid location" };
  }
  if (typeof loc.latitude !== "number" || loc.latitude < -90 || loc.latitude > 90) {
    return { success: false, error: "Invalid latitude (-90 to 90)" };
  }
  if (typeof loc.longitude !== "number" || loc.longitude < -180 || loc.longitude > 180) {
    return { success: false, error: "Invalid longitude (-180 to 180)" };
  }

  // Core metrics
  if (typeof d.speed !== "number" || d.speed < 0 || d.speed > 300) {
    return { success: false, error: "Invalid speed (0 to 300)" };
  }
  if (typeof d.rpm !== "number" || d.rpm < 0 || d.rpm > 12000) {
    return { success: false, error: "Invalid rpm (0 to 12000)" };
  }
  if (typeof d.fuelLevelPercent !== "number" || d.fuelLevelPercent < 0 || d.fuelLevelPercent > 100) {
    return { success: false, error: "Invalid fuelLevelPercent (0 to 100)" };
  }
  if (typeof d.engineTemperatureCelsius !== "number" || d.engineTemperatureCelsius < -40 || d.engineTemperatureCelsius > 160) {
    return { success: false, error: "Invalid engineTemperatureCelsius (-40 to 160)" };
  }
  if (typeof d.batteryVoltage !== "number" || d.batteryVoltage < 0 || d.batteryVoltage > 36) {
    return { success: false, error: "Invalid batteryVoltage (0 to 36)" };
  }
  if (typeof d.odometerKm !== "number" || d.odometerKm < 0) {
    return { success: false, error: "Invalid odometerKm (>= 0)" };
  }

  return {
    success: true,
    data: {
      eventId: event.eventId,
      eventType: "telemetry.raw",
      version: event.version || "1.0.0",
      vehicleId: event.vehicleId,
      deviceId: event.deviceId,
      timestamp: event.timestamp,
      data: {
        location: {
          latitude: loc.latitude,
          longitude: loc.longitude,
          heading: typeof loc.heading === "number" ? loc.heading : 0,
          altitude: loc.altitude,
        },
        speed: d.speed,
        rpm: Math.round(d.rpm),
        fuelLevelPercent: d.fuelLevelPercent,
        engineTemperatureCelsius: d.engineTemperatureCelsius,
        batteryVoltage: d.batteryVoltage,
        odometerKm: d.odometerKm,
        engineStatus: d.engineStatus === "OFF" || d.engineStatus === "IDLE" ? d.engineStatus : "ON",
        accelerationG: d.accelerationG,
      },
    },
  };
}
