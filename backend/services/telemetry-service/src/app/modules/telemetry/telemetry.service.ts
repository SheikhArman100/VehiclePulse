import type { PipelineStage } from "mongoose";
import { randomUUID } from "node:crypto";
import type { TelemetryRawEvent } from "@vehicle-pulse/event-contracts";
import type {
  ITelemetryHistoryQuery,
  ITelemetryNearbyQuery,
  ITelemetryRecord,
} from "./telemetry.interface.js";
import { Telemetry } from "./telemetry.model.js";
import { TelemetryKafkaProducer, type PublishResult } from "../../kafka/telemetryProducer.js";

/**
 * Transforms an incoming payload (either canonical TelemetryRawEvent or direct record)
 * into a canonical TelemetryRawEvent envelope for Kafka.
 */
function toCanonicalEnvelope(payload: any): TelemetryRawEvent {
  // If already a canonical event envelope
  if (payload.eventType === "telemetry.raw" && payload.eventId && payload.data) {
    return payload as TelemetryRawEvent;
  }

  // If passed directly as MongoDB format or flat body
  const vehicleId = payload.metadata?.vehicleId || payload.vehicleId;
  const deviceId = payload.metadata?.deviceId || payload.deviceId;
  const timestamp = payload.timestamp instanceof Date
    ? payload.timestamp.toISOString()
    : (payload.timestamp || new Date().toISOString());

  const location = payload.location?.coordinates
    ? {
        longitude: payload.location.coordinates[0],
        latitude: payload.location.coordinates[1],
        heading: payload.heading ?? 0,
        altitude: payload.altitude,
      }
    : (payload.location || { latitude: 0, longitude: 0, heading: 0 });

  return {
    eventId: payload.eventId || randomUUID(),
    eventType: "telemetry.raw",
    version: "1.0.0",
    vehicleId,
    deviceId,
    timestamp,
    data: {
      location,
      speed: payload.speed ?? 0,
      rpm: payload.rpm ?? 0,
      fuelLevelPercent: payload.fuelLevelPercent ?? 100,
      engineTemperatureCelsius: payload.engineTemperatureCelsius ?? 85,
      batteryVoltage: payload.batteryVoltage ?? 13.8,
      odometerKm: payload.odometerKm ?? 0,
      engineStatus: payload.engineStatus ?? "ON",
      accelerationG: payload.accelerationG ?? 0,
    },
  };
}

/**
 * Converts a canonical event into the MongoDB TimeSeries storage document.
 */
function toStorageRecord(event: TelemetryRawEvent): ITelemetryRecord {
  return {
    timestamp: new Date(event.timestamp),
    metadata: {
      vehicleId: event.vehicleId,
      deviceId: event.deviceId,
    },
    location: {
      type: "Point",
      coordinates: [event.data.location.longitude, event.data.location.latitude],
    },
    heading: event.data.location.heading,
    altitude: event.data.location.altitude,
    speed: event.data.speed,
    rpm: event.data.rpm,
    fuelLevelPercent: event.data.fuelLevelPercent,
    engineTemperatureCelsius: event.data.engineTemperatureCelsius,
    batteryVoltage: event.data.batteryVoltage,
    odometerKm: event.data.odometerKm,
    engineStatus: event.data.engineStatus,
    accelerationG: event.data.accelerationG,
  };
}

/**
 * Ingest a single telemetry event into Kafka (Kafka-First Ingestion).
 * Validates payload, publishes to Kafka topic `vehicle.telemetry.raw`,
 * and returns Kafka publish metadata without waiting for database writes.
 */
const recordTelemetry = async (
  payload: any,
  logger: any
): Promise<PublishResult> => {
  const envelope = toCanonicalEnvelope(payload);

  // Publish to Kafka topic vehicle.telemetry.raw (keyed by vehicleId)
  const kafkaPublish = await TelemetryKafkaProducer.publishTelemetryEvent(envelope, logger);

  if (!kafkaPublish.published) {
    throw new Error(kafkaPublish.error || "Failed to publish telemetry event to Kafka");
  }

  return kafkaPublish;
};

/**
 * Ingest a batch of telemetry events into Kafka (Kafka-First Ingestion).
 */
const recordTelemetryBatch = async (
  records: any[],
  logger: any
): Promise<{ publishedCount: number; errors: string[] }> => {
  const envelopes = records.map(toCanonicalEnvelope);
  return TelemetryKafkaProducer.publishTelemetryBatch(envelopes, logger);
};

/**
 * Bulk inserts events consumed asynchronously from Kafka into MongoDB Time-Series collection.
 * Invoked by the decoupled MongoDB consumer worker.
 */
const bulkInsertFromKafkaEvents = async (
  events: TelemetryRawEvent[]
): Promise<number> => {
  if (events.length === 0) return 0;
  const storageRecords = events.map(toStorageRecord);
  const result = await Telemetry.insertMany(storageRecords, { ordered: false });
  return result.length;
};

/**
 * Retrieve historical time-range telemetry for a vehicle.
 */
const getVehicleHistory = async (
  query: ITelemetryHistoryQuery
): Promise<{
  meta: { vehicleId: string; page: number; limit: number; total: number };
  data: ITelemetryRecord[];
}> => {
  const { vehicleId, from, to, page = 1, limit = 50 } = query;
  const skip = (page - 1) * limit;

  const matchConditions: Record<string, unknown> = {
    "metadata.vehicleId": vehicleId,
  };

  if (from || to) {
    matchConditions.timestamp = {};
    if (from) (matchConditions.timestamp as Record<string, unknown>).$gte = new Date(from);
    if (to) (matchConditions.timestamp as Record<string, unknown>).$lte = new Date(to);
  }

  const data = await Telemetry.find(matchConditions)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Telemetry.countDocuments(matchConditions);

  return {
    meta: {
      vehicleId,
      page,
      limit,
      total,
    },
    data: data as unknown as ITelemetryRecord[],
  };
};

/**
 * Retrieve the latest known telemetry state for a vehicle.
 */
const getLatestVehicleTelemetry = async (
  vehicleId: string
): Promise<ITelemetryRecord | null> => {
  const latest = await Telemetry.findOne({ "metadata.vehicleId": vehicleId })
    .sort({ timestamp: -1 })
    .lean();

  return (latest as unknown as ITelemetryRecord) || null;
};

/**
 * Geospatial search: Find telemetry points within a distance of a coordinate.
 */
const findNearbyTelemetry = async (
  query: ITelemetryNearbyQuery
): Promise<ITelemetryRecord[]> => {
  const { longitude, latitude, maxDistanceMeters = 10000, limit = 20 } = query;

  // Earth radius in meters approximately 6,378,100 meters
  const radiusInRadians = maxDistanceMeters / 6378100;

  const results = await Telemetry.find({
    location: {
      $geoWithin: {
        $centerSphere: [[longitude, latitude], radiusInRadians],
      },
    },
  })
    .limit(limit)
    .lean();

  return results as unknown as ITelemetryRecord[];
};

/**
 * Aggregation Pipeline: Calculate hourly stats (avg speed, max rpm, count) for a vehicle.
 */
const getVehicleHourlyStats = async (
  vehicleId: string,
  from?: Date,
  to?: Date
): Promise<
  Array<{
    hour: string;
    avgSpeed: number;
    maxSpeed: number;
    maxRpm: number;
    dataPointsCount: number;
  }>
> => {
  const matchStage: Record<string, unknown> = {
    "metadata.vehicleId": vehicleId,
  };

  if (from || to) {
    matchStage.timestamp = {};
    if (from) (matchStage.timestamp as Record<string, unknown>).$gte = from;
    if (to) (matchStage.timestamp as Record<string, unknown>).$lte = to;
  }

  const pipeline: PipelineStage[] = [
    { $match: matchStage },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d %H:00", date: "$timestamp" },
        },
        avgSpeed: { $avg: "$speed" },
        maxSpeed: { $max: "$speed" },
        maxRpm: { $max: "$rpm" },
        dataPointsCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 as const } },
    {
      $project: {
        _id: 0,
        hour: "$_id",
        avgSpeed: { $round: ["$avgSpeed", 2] },
        maxSpeed: 1,
        maxRpm: 1,
        dataPointsCount: 1,
      },
    },
  ];

  return Telemetry.aggregate(pipeline);
};

export const TelemetryService = {
  recordTelemetry,
  recordTelemetryBatch,
  bulkInsertFromKafkaEvents,
  getVehicleHistory,
  getLatestVehicleTelemetry,
  findNearbyTelemetry,
  getVehicleHourlyStats,
};
