import type { PipelineStage } from "mongoose";
import type {
  ITelemetryHistoryQuery,
  ITelemetryNearbyQuery,
  ITelemetryRecord,
} from "./telemetry.interface.js";
import { Telemetry } from "./telemetry.model.js";

/**
 * Ingest a single raw telemetry data point into MongoDB time-series collection.
 */
const recordTelemetry = async (
  payload: ITelemetryRecord
): Promise<ITelemetryRecord> => {
  const result = await Telemetry.create(payload);
  return result.toObject ? result.toObject() : result;
};

/**
 * Ingest a batch of telemetry records in one operation (high-throughput writes).
 */
const recordTelemetryBatch = async (
  records: ITelemetryRecord[]
): Promise<number> => {
  const result = await Telemetry.insertMany(records, { ordered: false });
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
  getVehicleHistory,
  getLatestVehicleTelemetry,
  findNearbyTelemetry,
  getVehicleHourlyStats,
};
