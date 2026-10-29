import path from "node:path";
import dotenv from "dotenv";
import { baseEnvSchema, validateEnv, z } from "@vehicle-pulse/config";

// Load environment variables from local or parent directory
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

export const alertEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(4003),
  SERVICE_NAME: z.string().default("alert-service"),
  MYSQL_URL: z
    .string()
    .optional()
    .transform((val) => {
      const raw = val || process.env.MYSQL_URL;
      if (raw) {
        if (raw.includes("@mysql:") && !process.env.RUNNING_IN_DOCKER) {
          // Map host port 3307 for local executions outside Docker
          return raw.replace("@mysql:3306", "@localhost:3307");
        }
        return raw;
      }
      return "mysql://vp_alerts_user:vp_alerts_password@localhost:3307/vehiclepulse_alerts";
    }),
  KAFKA_BROKERS: z.string().default("localhost:9092"),
  KAFKA_GROUP_ID: z.string().default("alert-service-group"),
});

export type AlertEnv = z.infer<typeof alertEnvSchema>;

export const env: AlertEnv = validateEnv(alertEnvSchema);
