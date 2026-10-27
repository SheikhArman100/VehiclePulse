import { z } from "zod";
import { createEventEnvelopeSchema } from "./envelope.js";

/**
 * Alert Severity Enum
 */
export const AlertSeverityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type AlertSeverity = z.infer<typeof AlertSeverityEnum>;

/**
 * Alert Trigger Event Data Schema
 */
export const AlertEventDataSchema = z.object({
  alertId: z.string().uuid(),
  ruleId: z.string().min(1),
  ruleName: z.string().min(1),
  severity: AlertSeverityEnum,
  status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED"]).default("OPEN"),
  metric: z.string(), // e.g. "speed", "engineTemperature"
  currentValue: z.number(),
  thresholdValue: z.number(),
  message: z.string().min(1),
  location: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
});

export type AlertEventData = z.infer<typeof AlertEventDataSchema>;

export const AlertTriggeredEventSchema = createEventEnvelopeSchema(AlertEventDataSchema).extend({
  eventType: z.literal("alert.triggered"),
});

export type AlertTriggeredEvent = z.infer<typeof AlertTriggeredEventSchema>;
