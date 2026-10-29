import { PrismaClient } from "../../generated/client.js";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import type { Logger } from "@vehicle-pulse/logger";
import { env } from "../../config/env.js";

let prismaInstance: PrismaClient | null = null;

export const getPrismaClient = (): PrismaClient => {
  if (!prismaInstance) {
    const adapter = new PrismaMariaDb(env.MYSQL_URL);

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

export const connectMySQL = async (logger: Logger): Promise<PrismaClient> => {
  const prisma = getPrismaClient();
  await prisma.$connect();
  logger.info("Successfully connected to MySQL (Alert Service)");
  return prisma;
};

export const disconnectMySQL = async (logger: Logger): Promise<void> => {
  if (prismaInstance) {
    logger.info("Disconnecting MySQL client...");
    await prismaInstance.$disconnect();
    prismaInstance = null;
    logger.info("MySQL client disconnected cleanly");
  }
};
