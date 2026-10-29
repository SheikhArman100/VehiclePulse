import path from "node:path";
import dotenv from "dotenv";
import { defineConfig, env } from "@prisma/config";

// Load environment variables from local service or monorepo backend .env
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });


export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});


