import { PrismaClient } from "../../generated/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import type { Logger } from "@vehicle-pulse/logger";
import { env } from "../../config/env.js";

let prismaInstance: PrismaClient | null = null;
let pgPoolInstance: pg.Pool | null = null;

export const getPrismaClient = (): PrismaClient => {
  if (!prismaInstance) {
    pgPoolInstance = new pg.Pool({
      connectionString: env.DATABASE_URL,
    });
    const adapter = new PrismaPg(pgPoolInstance);

    prismaInstance = new PrismaClient({
      adapter,
      log: [
        { emit: "event", level: "error" },
        { emit: "event", level: "warn" },
      ],
    });
  }
  return prismaInstance;
};



export const connectPostgres = async (logger: Logger): Promise<PrismaClient> => {
  const prisma = getPrismaClient();
  await prisma.$connect();
  logger.info("Successfully connected to PostgreSQL (Analytics Service)");
  return prisma;
};

export const disconnectPostgres = async (logger: Logger): Promise<void> => {
  if (prismaInstance) {
    logger.info("Disconnecting PostgreSQL client...");
    await prismaInstance.$disconnect();
    prismaInstance = null;
    if (pgPoolInstance) {
      await pgPoolInstance.end();
      pgPoolInstance = null;
    }
    logger.info("PostgreSQL client disconnected cleanly");
  }
};

