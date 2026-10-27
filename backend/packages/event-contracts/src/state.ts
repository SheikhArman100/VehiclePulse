import { z } from "zod";
import { createEventEnvelopeSchema } from "./envelope.js";
import { TelemetryDataSchema } from "./telemetry.js";

/**
 * Vehicle Current State Schema (Stored in Redis / Distributed via WebSocket)
 */
export const VehicleStateDataSchema = z.object({
  status: z.enum(["ONLINE", "OFFLINE", "WARNING", "CRITICAL"]),
  lastSeen: z.string().datetime(),
  latestTelemetry: TelemetryDataSchema,
  activeAlertCount: z.number().int().min(0).default(0),
});

export type VehicleStateData = z.infer<typeof VehicleStateDataSchema>;

export const VehicleStateUpdatedEventSchema = createEventEnvelopeSchema(VehicleStateDataSchema).extend({
  eventType: z.literal("vehicle.state.updated"),
});

export type VehicleStateUpdatedEvent = z.infer<typeof VehicleStateUpdatedEventSchema>;
