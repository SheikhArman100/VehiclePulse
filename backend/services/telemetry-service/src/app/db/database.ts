import mongoose from "mongoose";
import { type Logger } from "@vehicle-pulse/logger";

let isConnected = false;

export const connectDatabase = async (
  uri: string,
  logger: Logger
): Promise<void> => {
  try {
    mongoose.connection.on("connected", () => {
      isConnected = true;
      logger.info("[MongoDB] Connected to database successfully");
    });

    mongoose.connection.on("error", (err) => {
      isConnected = false;
      logger.error({ err }, "[MongoDB] Database connection error");
    });

    mongoose.connection.on("disconnected", () => {
      isConnected = false;
      logger.warn("[MongoDB] Database connection disconnected");
    });

    await mongoose.connect(uri);
  } catch (error) {
    logger.error({ error }, `[MongoDB] Failed to connect database: ${(error as Error).message}`);
    throw error;
  }
};

export const disconnectDatabase = async (logger: Logger): Promise<void> => {
  if (isConnected || mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info("[MongoDB] Disconnected database cleanly");
  }
};

export const isDatabaseHealthy = (): boolean => {
  return mongoose.connection.readyState === 1;
};
