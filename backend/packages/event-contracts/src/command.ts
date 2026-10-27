import { z } from "zod";
import { createEventEnvelopeSchema } from "./envelope.js";

/**
 * Command Types Enum
 */
export const CommandTypeEnum = z.enum([
  "LOCK_DOORS",
  "UNLOCK_DOORS",
  "START_ENGINE",
  "STOP_ENGINE",
  "FLASH_LIGHTS",
  "HONK_HORN",
  "SET_SPEED_LIMIT",
]);

export type CommandType = z.infer<typeof CommandTypeEnum>;

/**
 * Command Event Data Schema
 */
export const CommandEventDataSchema = z.object({
  commandId: z.string().uuid(),
  commandType: CommandTypeEnum,
  status: z.enum(["PENDING", "DISPATCHED", "ACKNOWLEDGED", "COMPLETED", "FAILED"]).default("PENDING"),
  parameters: z.record(z.unknown()).optional(),
  timeoutSeconds: z.number().int().min(1).max(300).default(30),
  dispatchedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  failureReason: z.string().optional(),
});

export type CommandEventData = z.infer<typeof CommandEventDataSchema>;

export const CommandDispatchedEventSchema = createEventEnvelopeSchema(CommandEventDataSchema).extend({
  eventType: z.literal("command.dispatched"),
});

export type CommandDispatchedEvent = z.infer<typeof CommandDispatchedEventSchema>;
