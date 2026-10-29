import path from "node:path";
import dotenv from "dotenv";
import { baseEnvSchema, validateEnv, z } from "@vehicle-pulse/config";

// Load environment variables from local or parent directory
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

export const analyticsEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(4002),
  SERVICE_NAME: z.string().default("analytics-service"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL must be configured"),
  KAFKA_BROKERS: z.string().default("localhost:9092"),
  KAFKA_GROUP_ID: z.string().default("analytics-consumer-group"),
});

export type AnalyticsEnv = z.infer<typeof analyticsEnvSchema>;

export const env: AnalyticsEnv = validateEnv(analyticsEnvSchema);

