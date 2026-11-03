"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScreenLoader, ErrorState, EmptyState } from "@/components/ui/states";
import { useVehicleWebSocket } from "@/hooks/useWebSocket";
import { formatDateTime, formatSpeed, formatPercent, formatDistance } from "@/lib/utils";
import {
  Truck,
  ArrowLeft,
  Activity,
  Gauge,
  Fuel,
  Battery,
  Thermometer,
  Compass,
  Lock,
  Unlock,
  PowerOff,
  Radio,
  Send,
  AlertCircle,
} from "lucide-react";

export default function VehicleDetailPage() {
  const params = useParams();
  const vehicleId = params.id as string;

  const [commandSuccess, setCommandSuccess] = useState<string | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [isSendingCommand, setIsSendingCommand] = useState(false);

  // Subscribe to live WebSocket updates for this vehicle
  const { isConnected, vehicleStates } = useVehicleWebSocket([vehicleId]);

  // Load static vehicle profile
  const {
    data: vehicleData,
    isLoading: isLoadingVehicle,
    error: vehicleError,
  } = useQuery({
    queryKey: ["vehicle", vehicleId],
    queryFn: () => api.telemetry.getVehicleById(vehicleId),
  });

  // Load sub-millisecond Redis state (falls back if WS is not active)
  const {
    data: redisStateData,
    isLoading: isLoadingState,
    refetch: refetchState,
  } = useQuery({
    queryKey: ["vehicle-state", vehicleId],
    queryFn: () => api.telemetry.getVehicleState(vehicleId),
    refetchInterval: isConnected ? false : 3000,
  });

  // Load recent MongoDB time-series points
  const {
    data: historyData,
    isLoading: isLoadingHistory,
  } = useQuery({
    queryKey: ["vehicle-history", vehicleId],
    queryFn: () => api.telemetry.getVehicleTelemetryHistory(vehicleId, { limit: 10 }),
    refetchInterval: 5000,
  });

  const vehicle = vehicleData?.data;
  // Prefer live WebSocket state if present, then Redis query state
  const liveState = vehicleStates[vehicleId] || redisStateData?.data;
  const history = historyData?.data || [];

  const handleSendCommand = async (
    cmd: "LOCK_DOORS" | "UNLOCK_DOORS" | "ENGINE_CUTOFF" | "PING_DIAGNOSTICS"
  ) => {
    setIsSendingCommand(true);
    setCommandSuccess(null);
    setCommandError(null);
    try {
      const res = await api.telemetry.sendVehicleCommand(vehicleId, cmd);
      setCommandSuccess(`Command ${cmd} accepted by RabbitMQ (ID: ${res.data.commandId})`);
    } catch (err: unknown) {
      setCommandError(err instanceof Error ? err.message : "Failed to dispatch command");
    } finally {
      setIsSendingCommand(false);
    }
  };

  if (isLoadingVehicle) {
    return <ScreenLoader title="Retrieving vehicle details..." className="py-24" />;
  }

  if (vehicleError || !vehicle) {
    return (
      <div className="py-12">
        <ErrorState
          title="Vehicle Not Found"
          error={(vehicleError as Error) || "The requested vehicle could not be loaded."}
        />
        <div className="mt-4 text-center">
          <Link href="/vehicles">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Fleet
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/vehicles">
            <Button variant="outline" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h1>
              <Badge
                variant={
                  liveState?.status === "ONLINE"
                    ? "success"
                    : vehicle.status === "ACTIVE"
                    ? "default"
                    : "secondary"
                }
              >
                {liveState?.status || vehicle.status}
              </Badge>
            </div>
            <p className="text-xs font-mono text-slate-400 mt-0.5">
              VIN: {vehicle.vin} | Plate: {vehicle.licensePlate}
            </p>
          </div>
        </div>

        {/* Live Stream Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
          <Activity
            className={`h-4 w-4 ${
              liveState?.status === "ONLINE" ? "text-emerald-400 animate-pulse" : "text-slate-500"
            }`}
          />
          <span className="text-slate-400">Stream Status:</span>
          <span
            className={`font-mono font-semibold ${
              liveState?.status === "ONLINE" ? "text-emerald-400" : "text-slate-400"
            }`}
          >
            {liveState?.status === "ONLINE" ? "STREAMING" : "OFFLINE / IDLE"}
          </span>
        </div>
      </div>

      {/* Real-time Telemetry Gauges Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Speed Gauge */}
        <Card className="bg-slate-900/80 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase">
              Current Speed
            </CardTitle>
            <Gauge className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold font-mono text-white">
              {formatSpeed(liveState?.metrics?.speedKmh)}
            </div>
            <span className="text-[11px] text-slate-500">Live GPS velocity</span>
          </CardContent>
        </Card>

        {/* Fuel Gauge */}
        <Card className="bg-slate-900/80 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase">
              Fuel Level
            </CardTitle>
            <Fuel className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold font-mono text-white">
              {formatPercent(liveState?.metrics?.fuelLevelPct)}
            </div>
            <span className="text-[11px] text-slate-500">Tank capacity</span>
          </CardContent>
        </Card>

        {/* Battery Gauge */}
        <Card className="bg-slate-900/80 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase">
              12V Battery
            </CardTitle>
            <Battery className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold font-mono text-white">
              {formatPercent(liveState?.metrics?.batteryLevelPct)}
            </div>
            <span className="text-[11px] text-slate-500">Electrical system</span>
          </CardContent>
        </Card>

        {/* Engine Temp Gauge */}
        <Card className="bg-slate-900/80 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase">
              Engine Temp
            </CardTitle>
            <Thermometer className="h-4 w-4 text-rose-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold font-mono text-white">
              {liveState?.metrics?.engineTempC
                ? `${Math.round(liveState.metrics.engineTempC)}°C`
                : "—"}
            </div>
            <span className="text-[11px] text-slate-500">Coolant temp</span>
          </CardContent>
        </Card>

        {/* Heading & Distance */}
        <Card className="bg-slate-900/80 border-slate-800 col-span-2 md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase">
              Odometer
            </CardTitle>
            <Compass className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold font-mono text-white truncate">
              {formatDistance(liveState?.metrics?.odometerKm)}
            </div>
            <span className="text-[11px] text-slate-500">
              Heading: {liveState?.location?.heading ? `${Math.round(liveState.location.heading)}°` : "—"}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Command Control & Coordinates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Remote Commands Dispatcher (Phase 20 RabbitMQ) */}
        <Card className="bg-slate-900/80 border-slate-800 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Send className="h-4 w-4 text-blue-400" /> Remote Commands
            </CardTitle>
            <CardDescription>
              Dispatches asynchronous command tasks to RabbitMQ with Redis distributed lock protection.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {commandSuccess && (
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-900 text-xs text-emerald-300">
                {commandSuccess}
              </div>
            )}
            {commandError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-900 text-xs text-rose-300">
                {commandError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSendCommand("LOCK_DOORS")}
                disabled={isSendingCommand}
                className="gap-2 text-xs"
              >
                <Lock className="h-3.5 w-3.5" /> Lock Doors
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSendCommand("UNLOCK_DOORS")}
                disabled={isSendingCommand}
                className="gap-2 text-xs"
              >
                <Unlock className="h-3.5 w-3.5" /> Unlock
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSendCommand("PING_DIAGNOSTICS")}
                disabled={isSendingCommand}
                className="gap-2 text-xs"
              >
                <Radio className="h-3.5 w-3.5" /> Diagnostic Ping
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleSendCommand("ENGINE_CUTOFF")}
                disabled={isSendingCommand}
                className="gap-2 text-xs"
              >
                <PowerOff className="h-3.5 w-3.5" /> Engine Cutoff
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* GPS Location & Coordinate Info */}
        <Card className="bg-slate-900/80 border-slate-800 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Compass className="h-4 w-4 text-indigo-400" /> GPS Geolocation
            </CardTitle>
            <CardDescription>
              Coordinates tracked in Redis GEO index and MongoDB TimeSeries collection.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {liveState?.location ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-xs text-slate-500 uppercase">Latitude</span>
                  <div className="font-mono text-sm text-slate-200 mt-0.5">
                    {liveState.location.latitude.toFixed(6)}°
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase">Longitude</span>
                  <div className="font-mono text-sm text-slate-200 mt-0.5">
                    {liveState.location.longitude.toFixed(6)}°
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase">Altitude</span>
                  <div className="font-mono text-sm text-slate-200 mt-0.5">
                    {liveState.location.altitudeMeters ? `${Math.round(liveState.location.altitudeMeters)} m` : "—"}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase">Last Updated</span>
                  <div className="font-mono text-sm text-slate-200 mt-0.5">
                    {formatDateTime(liveState.timestamp)}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                title="Awaiting GPS location signal"
                description="Once telemetry events stream for this vehicle ID, GPS positions will appear here."
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Historical Telemetry Stream Points */}
      <Card className="bg-slate-900/80 border-slate-800">
        <CardHeader>
          <CardTitle className="text-base text-white">Recent Telemetry Ingestions</CardTitle>
          <CardDescription>
            MongoDB time-series records written by Telemetry Service via Kafka consumer.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingHistory ? (
            <ScreenLoader title="Loading telemetry points..." className="py-8" />
          ) : history.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No telemetry history recorded yet"
                description="Run the vehicle simulator or dispatch events to observe real-time ingestion."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400 bg-slate-950/60">
                  <tr>
                    <th className="px-5 py-3">Timestamp</th>
                    <th className="px-5 py-3">Speed</th>
                    <th className="px-5 py-3">Fuel</th>
                    <th className="px-5 py-3">Battery</th>
                    <th className="px-5 py-3">Engine Temp</th>
                    <th className="px-5 py-3">Odometer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {history.map((pt) => (
                    <tr key={pt._id} className="hover:bg-slate-800/30">
                      <td className="px-5 py-2.5 text-slate-300">{formatDateTime(pt.timestamp)}</td>
                      <td className="px-5 py-2.5 text-blue-400">{formatSpeed(pt.speedKmh)}</td>
                      <td className="px-5 py-2.5 text-amber-400">{formatPercent(pt.fuelLevelPct)}</td>
                      <td className="px-5 py-2.5 text-emerald-400">{formatPercent(pt.batteryLevelPct)}</td>
                      <td className="px-5 py-2.5 text-rose-400">{Math.round(pt.engineTempC)}°C</td>
                      <td className="px-5 py-2.5 text-slate-400">{formatDistance(pt.odometerKm)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

