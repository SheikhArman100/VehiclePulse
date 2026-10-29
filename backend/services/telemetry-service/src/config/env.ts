import { baseEnvSchema, validateEnv, z } from "@vehicle-pulse/config";

export const telemetryEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(4001),
  SERVICE_NAME: z.string().default("telemetry-service"),
  MONGODB_URI: z
    .string()
    .default("mongodb://localhost:27017/vehiclepulse_telemetry"),
  KAFKA_BROKERS: z.string().default("localhost:9092"),
  RABBITMQ_URL: z.string().default("amqp://guest:guest@localhost:5672"),
});

export type TelemetryEnv = z.infer<typeof telemetryEnvSchema>;

export const env: TelemetryEnv = validateEnv(telemetryEnvSchema);
