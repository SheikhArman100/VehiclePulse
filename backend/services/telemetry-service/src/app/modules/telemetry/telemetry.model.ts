import mongoose, { Schema } from "mongoose";
import type { ITelemetryRecord } from "./telemetry.interface.js";

const GeoPointSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
      default: "Point",
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  { _id: false }
);

const TelemetrySchema = new Schema<ITelemetryRecord>(
  {
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    metadata: {
      vehicleId: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },
      deviceId: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },
      vin: {
        type: String,
        trim: true,
      },
    },
    location: {
      type: GeoPointSchema,
      required: true,
    },
    heading: { type: Number, default: 0 },
    altitude: { type: Number },
    speed: { type: Number, required: true },
    rpm: { type: Number, required: true },
    fuelLevelPercent: { type: Number, required: true },
    engineTemperatureCelsius: { type: Number, required: true },
    batteryVoltage: { type: Number, required: true },
    odometerKm: { type: Number, required: true },
    engineStatus: {
      type: String,
      enum: ["ON", "OFF", "IDLE"],
      default: "ON",
    },
    accelerationG: { type: Number },
  },
  {
    timestamps: false,
    timeseries: {
      timeField: "timestamp",
      metaField: "metadata",
      granularity: "seconds",
    },
  }
);

// Compound index for historical vehicle time-range queries
TelemetrySchema.index({ "metadata.vehicleId": 1, timestamp: -1 });

// 2dsphere index for geospatial proximity queries
TelemetrySchema.index({ location: "2dsphere" });

export const Telemetry = mongoose.model<ITelemetryRecord>(
  "Telemetry",
  TelemetrySchema
);
