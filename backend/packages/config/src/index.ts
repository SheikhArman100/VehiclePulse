import dotenv from "dotenv";
import { z } from "zod";

// Load local environment files if present
dotenv.config();

/**
 * Base common environment schema shared across all microservices
 */
export const baseEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(4000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
});

export type BaseEnv = z.infer<typeof baseEnvSchema>;

/**
 * Validates process.env against a provided Zod schema.
 * Fails fast on invalid or missing required variables with a structured error.
 */
export function validateEnv<T extends z.ZodTypeAny>(
  schema: T,
  rawEnv: NodeJS.ProcessEnv = process.env
): z.infer<T> {
  const result = schema.safeParse(rawEnv);

  if (!result.success) {
    const formattedErrors = result.error.errors
      .map((err) => `  - [${err.path.join(".")}]: ${err.message}`)
      .join("\n");

    const message = `\n========================================\n[CONFIG FATAL] Invalid environment variables:\n${formattedErrors}\n========================================\n`;
    console.error(message);
    throw new Error(message);
  }

  return result.data;
}

export * from "zod";
