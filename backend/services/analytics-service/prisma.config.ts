import path from "node:path";
import dotenv from "dotenv";
import { defineConfig, env } from "@prisma/config";

// Load environment variables from local service or monorepo backend .env
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });


const rawUrl = process.env.POSTGRES_URL || "";
const resolvedUrl =
  rawUrl.includes("@postgres:") && !process.env.RUNNING_IN_DOCKER
    ? rawUrl.replace("@postgres:5432", "@localhost:5433")
    : rawUrl || "postgresql://vp_analytics_user:vp_analytics_password@localhost:5433/vehiclepulse_analytics?schema=public";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: resolvedUrl,
  },
});


