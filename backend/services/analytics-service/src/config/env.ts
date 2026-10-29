import { baseEnvSchema, validateEnv, z } from "@vehicle-pulse/config";

export const analyticsEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(4002),
  SERVICE_NAME: z.string().default("analytics-service"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL must be configured"),
  KAFKA_BROKERS: z.string().default("localhost:9092"),
  KAFKA_GROUP_ID: z.string().default("analytics-consumer-group"),
});

export type AnalyticsEnv = z.infer<typeof analyticsEnvSchema>;

export const env: AnalyticsEnv = validateEnv(analyticsEnvSchema);
