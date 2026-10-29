import path from "node:path";
import dotenv from "dotenv";
import { baseEnvSchema, validateEnv, z } from "@vehicle-pulse/config";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

export const workerEnvSchema = baseEnvSchema.extend({
  SERVICE_NAME: z.string().default("command-worker"),
  RABBITMQ_URL: z
    .string()
    .optional()
    .transform((val) => {
      const raw = val || process.env.RABBITMQ_URL;
      if (raw) {
        if (raw.includes("@rabbitmq:") && !process.env.RUNNING_IN_DOCKER) {
          return raw.replace("@rabbitmq:", "@localhost:");
        }
        return raw;
      }
      return "amqp://guest:guest@localhost:5672";
    }),
  PREFETCH: z.coerce.number().default(10),
  MAX_RETRIES: z.coerce.number().default(3),
});

export type WorkerEnv = z.infer<typeof workerEnvSchema>;

export const env: WorkerEnv = validateEnv(workerEnvSchema);
