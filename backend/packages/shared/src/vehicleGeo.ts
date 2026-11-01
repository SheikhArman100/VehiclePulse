import type { Redis } from "ioredis";
import type { Logger } from "@vehicle-pulse/logger";

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface NearbyVehicleResult {
  vehicleId: string;
  distanceKm: number;
  latitude: number;
  longitude: number;
}

export interface VehicleGeoOptions {
  key?: string;
}

export class VehicleGeoService {
  private redis: Redis;
  private logger: Logger;
  private key: string;

  constructor(redis: Redis, logger: Logger, options: VehicleGeoOptions = {}) {
    this.redis = redis;
    this.logger = logger;
    this.key = options.key || "fleet:locations:geo";
  }

  /**
   * Adds or updates a vehicle's coordinates in the Redis geospatial index
   * Note: Redis GEOADD takes (key, longitude, latitude, member)
   */
  public async updateLocation(
    vehicleId: string,
    longitude: number,
    latitude: number
  ): Promise<void> {
    try {
      await this.redis.geoadd(this.key, longitude, latitude, vehicleId);
    } catch (err) {
      this.logger.error({ err, vehicleId, longitude, latitude }, "Error executing GEOADD in Redis");
      throw err;
    }
  }

  /**
   * Removes a vehicle from the geospatial index (e.g. decommissioned or offline)
   */
  public async removeLocation(vehicleId: string): Promise<void> {
    try {
      await this.redis.zrem(this.key, vehicleId);
    } catch (err) {
      this.logger.error({ err, vehicleId }, "Error removing vehicle from GEO index in Redis");
      throw err;
    }
  }

  /**
   * Searches for nearby vehicles within radiusKm of (longitude, latitude)
   * Uses Redis GEOSEARCH with FROMLONLAT, BYRADIUS, WITHDIST, WITHCOORD, ASC
   */
  public async findNearby(
    longitude: number,
    latitude: number,
    radiusKm: number,
    limit: number = 20
  ): Promise<NearbyVehicleResult[]> {
    try {
      // ioredis geosearch:
      // client.geosearch(key, 'FROMLONLAT', lon, lat, 'BYRADIUS', radius, 'km', 'WITHDIST', 'WITHCOORD', 'COUNT', limit, 'ASC')
      const rawResults = (await (this.redis as any).geosearch(
        this.key,
        "FROMLONLAT",
        longitude,
        latitude,
        "BYRADIUS",
        radiusKm,
        "km",
        "WITHDIST",
        "WITHCOORD",
        "COUNT",
        limit,
        "ASC"
      )) as [string, string, [string, string]][];

      if (!rawResults || !Array.isArray(rawResults)) {
        return [];
      }

      return rawResults.map(([vehicleId, distanceStr, [lonStr, latStr]]) => ({
        vehicleId,
        distanceKm: parseFloat(distanceStr),
        longitude: parseFloat(lonStr),
        latitude: parseFloat(latStr),
      }));
    } catch (err) {
      this.logger.error(
        { err, longitude, latitude, radiusKm, limit },
        "Error executing GEOSEARCH in Redis"
      );
      throw err;
    }
  }

  /**
   * Returns total count of vehicles currently indexed in the geospatial set
   */
  public async getIndexedCount(): Promise<number> {
    return this.redis.zcard(this.key);
  }
}
