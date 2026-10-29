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
  POSTGRES_URL: z
    .string()
    .optional()
    .transform((val) => {
      const raw = val || process.env.POSTGRES_URL;
      if (raw) {
        if (raw.includes("@postgres:") && !process.env.RUNNING_IN_DOCKER) {
          return raw.replace("@postgres:5432", "@localhost:5433");
        }
        return raw;
      }
      return "postgresql://vp_analytics_user:vp_analytics_password@localhost:5433/vehiclepulse_analytics?schema=public";
    }),
  KAFKA_BROKERS: z.string().default("localhost:9092"),
  KAFKA_GROUP_ID: z.string().default("analytics-consumer-group"),
});

export type AnalyticsEnv = z.infer<typeof analyticsEnvSchema>;

export const env: AnalyticsEnv = validateEnv(analyticsEnvSchema);

