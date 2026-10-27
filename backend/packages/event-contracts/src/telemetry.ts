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
