import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import {
  AlertIncident,
  ApiResponse,
  FleetAnalyticsSummary,
  HourlyFleetRollup,
  Vehicle,
  VehicleRealtimeState,
  VehicleTelemetryPoint,
} from "../types/api";

/**
 * Base URL resolution:
 * Defaults to the Nginx reverse proxy endpoint on port 80.
 * In browser: calls window.location.origin / http://localhost
 */
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost/api";

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 10000,
});

// Response interceptor for unified error extraction
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const errorData = error.response?.data as { message?: string } | undefined;
    const customMessage = errorData?.message || error.message || "An unexpected error occurred";
    return Promise.reject(new Error(customMessage));
  }
);

/**
 * Typed API modules for VehiclePulse microservices via Nginx
 */
export const api = {
  telemetry: {
    /**
     * Fetch list of registered fleet vehicles
     */
    async getVehicles(params?: {
      page?: number;
      limit?: number;
      searchTerm?: string;
      status?: string;
    }): Promise<ApiResponse<Vehicle[]>> {
      const response = await apiClient.get<ApiResponse<Vehicle[]>>(
        "/telemetry/v1/vehicles",
        { params }
      );
      return response.data;
    },

    /**
     * Fetch details of a single vehicle
     */
    async getVehicleById(id: string): Promise<ApiResponse<Vehicle>> {
      const response = await apiClient.get<ApiResponse<Vehicle>>(
        `/telemetry/v1/vehicles/${id}`
      );
      return response.data;
    },

    /**
     * Fetch the sub-millisecond Redis state of a vehicle
     */
    async getVehicleState(id: string): Promise<ApiResponse<VehicleRealtimeState>> {
      const response = await apiClient.get<ApiResponse<VehicleRealtimeState>>(
        `/telemetry/v1/vehicles/${id}/state`
      );
      return response.data;
    },

    /**
     * Fetch recent telemetry history points for a vehicle
     */
    async getVehicleTelemetryHistory(
      id: string,
      params?: { limit?: number }
    ): Promise<ApiResponse<VehicleTelemetryPoint[]>> {
      const response = await apiClient.get<ApiResponse<VehicleTelemetryPoint[]>>(
        `/telemetry/v1/vehicles/${id}/telemetry`,
        { params }
      );
      return response.data;
    },

    /**
     * Fetch nearby vehicles within radius (km) using Redis GEOSEARCH
     */
    async getNearbyVehicles(params: {
      latitude: number;
      longitude: number;
      radiusKm: number;
    }): Promise<ApiResponse<Array<{ vehicleId: string; distanceKm: number }>>> {
      const response = await apiClient.get<
        ApiResponse<Array<{ vehicleId: string; distanceKm: number }>>
      >("/telemetry/v1/vehicles/nearby", { params });
      return response.data;
    },

    /**
     * Dispatch an asynchronous command to a vehicle via RabbitMQ
     */
    async sendVehicleCommand(
      id: string,
      commandType: "LOCK_DOORS" | "UNLOCK_DOORS" | "ENGINE_CUTOFF" | "PING_DIAGNOSTICS",
      payload?: Record<string, unknown>
    ): Promise<ApiResponse<{ commandId: string; status: string }>> {
      const response = await apiClient.post<
        ApiResponse<{ commandId: string; status: string }>
      >(`/telemetry/v1/vehicles/${id}/commands`, {
        commandType,
        payload,
      });
      return response.data;
    },
  },

  analytics: {
    /**
     * Fetch overall fleet analytics summary from PostgreSQL
     */
    async getFleetSummary(): Promise<ApiResponse<FleetAnalyticsSummary>> {
      const response = await apiClient.get<ApiResponse<FleetAnalyticsSummary>>(
        "/analytics/v1/summary"
      );
      return response.data;
    },

    /**
     * Fetch hourly rollups for charts & operational graphs
     */
    async getHourlyRollups(params?: {
      vehicleId?: string;
      limit?: number;
    }): Promise<ApiResponse<HourlyFleetRollup[]>> {
      const response = await apiClient.get<ApiResponse<HourlyFleetRollup[]>>(
        "/analytics/v1/hourly",
        { params }
      );
      return response.data;
    },
  },

  alerts: {
    /**
     * Fetch open and active alert incidents
     */
    async getIncidents(params?: {
      status?: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
      severity?: string;
      vehicleId?: string;
    }): Promise<ApiResponse<AlertIncident[]>> {
      const response = await apiClient.get<ApiResponse<AlertIncident[]>>(
        "/alerts/v1/incidents",
        { params }
      );
      return response.data;
    },

    /**
     * Acknowledge an incident
     */
    async acknowledgeIncident(
      id: string,
      acknowledgedBy = "operator"
    ): Promise<ApiResponse<AlertIncident>> {
      const response = await apiClient.patch<ApiResponse<AlertIncident>>(
        `/alerts/v1/incidents/${id}/acknowledge`,
        { acknowledgedBy }
      );
      return response.data;
    },

    /**
     * Resolve an incident
     */
    async resolveIncident(
      id: string,
      resolvedBy = "operator"
    ): Promise<ApiResponse<AlertIncident>> {
      const response = await apiClient.patch<ApiResponse<AlertIncident>>(
        `/alerts/v1/incidents/${id}/resolve`,
        { resolvedBy }
      );
      return response.data;
    },
  },
};

