import pino, { Logger, LoggerOptions } from "pino";

export interface CreateLoggerOptions {
  serviceName: string;
  level?: string;
  pretty?: boolean;
}

/**
 * Creates a configured Pino structured logger instance.
 * Supports JSON structured logging in production and formatted output in development.
 */
export function createLogger(options: CreateLoggerOptions): Logger {
  const isDevelopment = process.env.NODE_ENV !== "production";
  const level = options.level || process.env.LOG_LEVEL || "info";

  const pinoOptions: LoggerOptions = {
    name: options.serviceName,
    level,
    base: {
      service: options.serviceName,
      env: process.env.NODE_ENV || "development",
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
  };

  if ((options.pretty ?? isDevelopment) && process.env.NODE_ENV !== "test") {
    // In dev mode, use pino-pretty if available
    return pino({
      ...pinoOptions,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      },
    });
  }

  return pino(pinoOptions);
}

export type { Logger } from "pino";
