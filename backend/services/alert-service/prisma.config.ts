import path from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "@prisma/config";

// Load environment variables from local service or monorepo backend .env
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

const rawUrl = process.env.MYSQL_URL || "";
const resolvedUrl =
  rawUrl.includes("@mysql:") && !process.env.RUNNING_IN_DOCKER
    ? rawUrl.replace("@mysql:3306", "@localhost:3307")
    : rawUrl;

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: resolvedUrl,
  },
});
