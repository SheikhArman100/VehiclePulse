import { z } from "zod";

/**
 * Standard Event Types Enum
 */
export const EventTypeEnum = z.enum([
  "telemetry.raw",
  "telemetry.processed",
  "vehicle.state.updated",
  "alert.triggered",
  "alert.acknowledged",
  "alert.resolved",
  "command.dispatched",
  "command.acknowledged",
  "command.completed",
  "command.failed",
]);

export type EventType = z.infer<typeof EventTypeEnum>;

/**
 * Canonical Event Envelope Factory
 *
 * Ensures every event published across Kafka or RabbitMQ carries a deterministic envelope:
 * - eventId: UUID v4 (unique for idempotency tracking)
 * - eventType: Named namespace event type
 * - version: SemVer or major version string (e.g., "1.0.0")
 * - vehicleId: Identifier of the vehicle (partition key for Kafka)
 * - deviceId: Identifier of the telematics hardware unit
 * - timestamp: ISO-8601 UTC string (e.g. 2026-10-27T12:00:00.000Z)
 * - data: Typed payload
 */
export function createEventEnvelopeSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    eventId: z.string().uuid("eventId must be a valid UUID v4"),
    eventType: EventTypeEnum,
    version: z.string().regex(/^\d+\.\d+\.\d+$/, "version must follow SemVer format (e.g. 1.0.0)").default("1.0.0"),
    vehicleId: z.string().min(1, "vehicleId is required"),
    deviceId: z.string().min(1, "deviceId is required"),
    timestamp: z.string().datetime({ message: "timestamp must be an ISO-8601 UTC string" }),
    data: dataSchema,
  });
}

export type EventEnvelope<T> = {
  eventId: string;
  eventType: EventType;
  version: string;
  vehicleId: string;
  deviceId: string;
  timestamp: string;
  data: T;
};
