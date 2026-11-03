"use client";

import React, { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { VehicleTelemetryPoint, ApiResponse } from "@/types/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScreenLoader, ErrorState, EmptyState } from "@/components/ui/states";
import { useVehicleWebSocket } from "@/hooks/useWebSocket";
import { formatSpeed, formatPercent, formatDateTime } from "@/lib/utils";
import {
  MapPin,
  RefreshCw,
  Truck,
  Activity,
  Layers,
  Search,
  Filter,
  ArrowRight,
  Info,
} from "lucide-react";

// Dynamic import of Leaflet map component with SSR disabled
const FleetLeafletMap = dynamic(
  () => import("@/components/map/fleet-map"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[620px] rounded-xl flex items-center justify-center bg-slate-950 border border-slate-800 text-slate-400">
        <ScreenLoader title="Initializing OpenStreetMap tile engine..." />
      </div>
    ),
  }
);

export default function LiveMapPage() {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Connect to live WebSocket stream
  const { isConnected, vehicleStates } = useVehicleWebSocket();

  // Load registered fleet vehicles
  const {
    data: vehiclesResponse,
    isLoading: isLoadingVehicles,
    error: vehiclesError,
    refetch: refetchVehicles,
    isFetching,
  } = useQuery({
    queryKey: ["vehicles", "map-list"],
    queryFn: () => api.telemetry.getVehicles({ limit: 50 }),
  });

  // Load telemetry trail for the currently selected vehicle
  const {
    data: historyResponse,
    isLoading: isLoadingHistory,
  } = useQuery<ApiResponse<VehicleTelemetryPoint[]>>({
    queryKey: ["vehicle-trail", selectedVehicleId],
    queryFn: () => {
      if (!selectedVehicleId) {
        return Promise.resolve({
          success: true,
          statusCode: 200,
          message: "Empty",
          data: [],
        });
      }
      return api.telemetry.getVehicleTelemetryHistory(selectedVehicleId, { limit: 25 });
    },
    enabled: !!selectedVehicleId,
    refetchInterval: 5000,
  });

  const vehicles = vehiclesResponse?.data || [];
  const historyPoints = historyResponse?.data || [];

  // Filter vehicles for sidebar list
  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch =
      v.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vin.toLowerCase().includes(searchTerm.toLowerCase());

    const state = vehicleStates[v._id];
    const matchesStatus =
      !statusFilter ||
      (statusFilter === "ONLINE" && state?.status === "ONLINE") ||
      (statusFilter === "OFFLINE" && state?.status !== "ONLINE");

    return matchesSearch && matchesStatus;
  });

  const selectedVehicle = vehicles.find((v) => v._id === selectedVehicleId);
  const selectedState = selectedVehicleId ? vehicleStates[selectedVehicleId] : null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <MapPin className="h-6 w-6 text-emerald-400" />
            Live Fleet Map
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time geospatial tracking via OpenStreetMap, Redis GEO coordinates, and WebSocket streams.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
            <Activity className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
            <span className="text-slate-400">Stream:</span>
            <span className={isConnected ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
              {isConnected ? "CONNECTED" : "RECONNECTING"}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchVehicles()}
            disabled={isFetching}
            className="gap-2 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Map & Fleet Selector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Interactive Vehicle Selector */}
        <Card className="bg-slate-900/80 border-slate-800 lg:col-span-1 flex flex-col h-[620px]">
          <CardHeader className="p-4 pb-3 border-b border-slate-800">
            <CardTitle className="text-sm font-semibold text-white flex items-center justify-between">
              <span>Fleet Entities ({filteredVehicles.length})</span>
              <Layers className="h-4 w-4 text-slate-400" />
            </CardTitle>
            <div className="pt-2 space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter fleet..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-1">
                {(["", "ONLINE", "OFFLINE"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`flex-1 py-1 rounded text-[11px] font-semibold transition-colors ${
                      statusFilter === s
                        ? "bg-blue-600 text-white"
                        : "bg-slate-950 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    {s === "" ? "ALL" : s}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-2 flex-1 overflow-y-auto space-y-1">
            {isLoadingVehicles ? (
              <ScreenLoader title="Loading fleet list..." className="py-8" />
            ) : filteredVehicles.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title="No vehicles match"
                  description="Adjust filter or check if vehicles are seeded."
                />
              </div>
            ) : (
              filteredVehicles.map((vehicle) => {
                const state = vehicleStates[vehicle._id];
                const isOnline = state?.status === "ONLINE";
                const isSelected = selectedVehicleId === vehicle._id;

                return (
                  <div
                    key={vehicle._id}
                    onClick={() => setSelectedVehicleId(vehicle._id)}
                    className={`p-3 rounded-lg cursor-pointer transition-all border ${
                      isSelected
                        ? "bg-blue-950/40 border-blue-500/50 shadow-sm"
                        : "bg-slate-950/40 border-slate-800/60 hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-white">
                        {vehicle.make} {vehicle.model}
                      </span>
                      <Badge variant={isOnline ? "success" : "secondary"} className="text-[10px] py-0">
                        {isOnline ? "ONLINE" : "OFFLINE"}
                      </Badge>
                    </div>

                    <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                      <span>{vehicle.licensePlate}</span>
                      <span>{state?.metrics ? formatSpeed(state.metrics.speedKmh) : "—"}</span>
                    </div>

                    {state?.location && (
                      <div className="text-[10px] text-slate-500 font-mono mt-1">
                        {state.location.latitude.toFixed(4)}°, {state.location.longitude.toFixed(4)}°
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Right Map Canvas */}
        <div className="lg:col-span-3">
          <FleetLeafletMap
            vehicles={vehicles}
            vehicleStates={vehicleStates}
            selectedVehicleId={selectedVehicleId}
            onSelectVehicle={(id) => setSelectedVehicleId(id)}
            historyPoints={historyPoints}
          />
        </div>
      </div>

      {/* Selected Vehicle Quick Telemetry Bar */}
      {selectedVehicle && (
        <Card className="bg-slate-900/90 border-slate-800 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base">
                  {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
                </span>
                <Badge variant={selectedState?.status === "ONLINE" ? "success" : "secondary"}>
                  {selectedState?.status || "OFFLINE"}
                </Badge>
              </div>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                VIN: {selectedVehicle.vin} | Plate: {selectedVehicle.licensePlate}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs font-mono">
              <div>
                <span className="text-slate-500 block uppercase">Speed</span>
                <span className="text-blue-400 font-bold text-sm">
                  {formatSpeed(selectedState?.metrics?.speedKmh)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase">Fuel</span>
                <span className="text-amber-400 font-bold text-sm">
                  {formatPercent(selectedState?.metrics?.fuelLevelPct)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase">Battery</span>
                <span className="text-emerald-400 font-bold text-sm">
                  {formatPercent(selectedState?.metrics?.batteryLevelPct)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase">Engine Temp</span>
                <span className="text-rose-400 font-bold text-sm">
                  {selectedState?.metrics?.engineTempC ? `${Math.round(selectedState.metrics.engineTempC)}°C` : "—"}
                </span>
              </div>
            </div>

            <Link href={`/vehicles/${selectedVehicle._id}`}>
              <Button size="sm" variant="default" className="text-xs gap-1.5">
                Full Details & Commands <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Free Tooling & Policy Documentation Callout */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 leading-relaxed">
        <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-200">Open-Source & Free-Only Policy Compliance: </span>
          This map renders dynamically via <span className="text-slate-200">Leaflet</span> and the public
          <span className="text-slate-200"> OpenStreetMap</span> tile server without requiring proprietary API tokens,
          credit cards, or third-party paid subscriptions. Please note that public OSM tile servers have usage limits;
          for high-throughput enterprise production deployment, a self-hosted vector tile server (e.g. TileServer GL / Martin)
          or local caching tile proxy is recommended.
        </div>
      </div>
    </div>
  );
}
