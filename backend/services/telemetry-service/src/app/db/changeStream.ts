import type { ChangeStream, ChangeStreamDocument } from "mongodb";
import type { Logger } from "@vehicle-pulse/logger";
import { Vehicle } from "../modules/vehicle/vehicle.model.js";

export interface ChangeStreamManagerOptions {
  logger: Logger;
  onVehicleChange?: (change: ChangeStreamDocument<any>) => Promise<void> | void;
}

/**
 * MongoDB Change Stream Manager for Vehicle inventory and configuration changes.
 * Tracks resume tokens to recover seamlessly across disconnections or process restarts.
 */
export class MongoChangeStreamManager {
  private static changeStream: ChangeStream | null = null;
  private static resumeToken: unknown = null;
  private static isRunning = false;
  private static reconnectTimer: NodeJS.Timeout | null = null;

  /**
   * Starts watching the Vehicle collection for lifecycle changes (insert, update, delete).
   */
  public static async startWatching(options: ChangeStreamManagerOptions): Promise<void> {
    const { logger, onVehicleChange } = options;

    if (this.isRunning) {
      logger.warn("MongoChangeStreamManager is already watching");
      return;
    }

    try {
      const pipeline = [
        {
          $match: {
            operationType: { $in: ["insert", "update", "replace", "delete"] },
          },
        },
      ];

      const watchOptions: Record<string, unknown> = {
        fullDocument: "updateLookup",
      };

      if (this.resumeToken) {
        watchOptions.resumeAfter = this.resumeToken;
        logger.info({ resumeToken: this.resumeToken }, "Resuming MongoDB Change Stream from token");
      }

      this.changeStream = Vehicle.watch(pipeline, watchOptions);
      this.isRunning = true;
      logger.info("MongoDB Change Stream initialized on Vehicle collection");

      this.changeStream.on("change", async (change: ChangeStreamDocument<any>) => {
        // Save resume token for fault tolerance
        if (change._id) {
          this.resumeToken = change._id;
        }

        const operationType = change.operationType;
        const documentKey = (change as any).documentKey?._id;
        const fullDoc = (change as any).fullDocument;

        logger.info(
          { operationType, documentId: documentKey, vin: fullDoc?.vin },
          "MongoDB Change Stream event detected"
        );

        if (onVehicleChange) {
          try {
            await onVehicleChange(change);
          } catch (err) {
            logger.error({ err, documentKey }, "Error processing change stream event");
          }
        }
      });

      this.changeStream.on("error", (err: any) => {
        logger.error({ err }, "MongoDB Change Stream error encountered");
        this.scheduleRestart(options);
      });

      this.changeStream.on("close", () => {
        logger.warn("MongoDB Change Stream closed");
        if (this.isRunning) {
          this.scheduleRestart(options);
        }
      });
    } catch (err: any) {
      logger.error({ err: err.message }, "Failed to start MongoDB Change Stream (ensure Replica Set is enabled)");
    }
  }

  /**
   * Schedules restart with backoff, preserving resume token.
   */
  private static scheduleRestart(options: ChangeStreamManagerOptions): void {
    this.isRunning = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    this.reconnectTimer = setTimeout(async () => {
      options.logger.info("Attempting to reconnect MongoDB Change Stream with saved resume token...");
      await this.startWatching(options);
    }, 3000);
  }

  /**
   * Retrieves the current resume token.
   */
  public static getResumeToken(): unknown {
    return this.resumeToken;
  }

  /**
   * Stops the change stream gracefully.
   */
  public static async stopWatching(): Promise<void> {
    this.isRunning = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.changeStream) {
      const stream = this.changeStream;
      this.changeStream = null;
      stream.removeAllListeners();
      await stream.close();
    }
  }
}
