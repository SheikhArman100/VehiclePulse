"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScreenLoader, ErrorState, EmptyState } from "@/components/ui/states";
import { useVehicleWebSocket } from "@/hooks/useWebSocket";
import {
  Truck,
  Activity,
  AlertTriangle,
  Server,
  Zap,
  ArrowRight,
  Gauge,
  Radio,
  CheckCircle2,
} from "lucide-react";

export default function HomePage() {
  const { isConnected, vehicleStates } = useVehicleWebSocket();

  // Load registered vehicles from Telemetry Service via Nginx
  const {
    data: vehiclesData,
    isLoading: isLoadingVehicles,
    error: vehiclesError,
    refetch: refetchVehicles,
  } = useQuery({
    queryKey: ["vehicles", "overview"],
    queryFn: () => api.telemetry.getVehicles({ limit: 5 }),
    retry: 1,
  });

  // Load fleet summary from Analytics Service via Nginx
  const {
    data: summaryData,
    isLoading: isLoadingSummary,
    error: summaryError,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ["fleet-summary"],
    queryFn: () => api.analytics.getFleetSummary(),
    retry: 1,
  });

  // Load active alerts from Alert Service via Nginx
  const {
    data: alertsData,
    isLoading: isLoadingAlerts,
    error: alertsError,
    refetch: refetchAlerts,
  } = useQuery({
    queryKey: ["active-alerts"],
    queryFn: () => api.alerts.getIncidents({ status: "OPEN" }),
    retry: 1,
  });

  const vehicles = vehiclesData?.data || [];
  const summary = summaryData?.data;
  const activeAlerts = alertsData?.data || [];

  return (
    <div className="space-y-8">
      {/* Platform Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border border-slate-800 p-6 sm:p-8">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-mono text-blue-400">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            Phase 25 Operational Baseline
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            VehiclePulse Distributed Fleet Dashboard
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Streaming real-time vehicular telemetry across Apache Kafka KRaft, MongoDB Time-Series, 
            PostgreSQL Analytics, MySQL Alert Rules, and Redis Pub/Sub WebSockets via Nginx.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link href="/vehicles">
              <Button size="sm" className="gap-2">
                <Truck className="h-4 w-4" /> View Fleet
              </Button>
            </Link>
            <Link href="/alerts">
              <Button size="sm" variant="outline" className="gap-2">
                <AlertTriangle className="h-4 w-4" /> Active Incidents
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Fleet */}
        <Card className="bg-slate-900/80 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Registered Vehicles
            </CardTitle>
            <Truck className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-white">
              {vehiclesData?.meta?.total ?? vehicles.length}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Active tracking entities
            </p>
          </CardContent>
        </Card>

        {/* Metric 2: Live WebSocket State */}
        <Card className="bg-slate-900/80 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Live Stream Engine
            </CardTitle>
            <Activity className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {isConnected ? "CONNECTED" : "CONNECTING"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Redis Pub/Sub on /ws
            </p>
          </CardContent>
        </Card>

        {/* Metric 3: Active Incidents */}
        <Card className="bg-slate-900/80 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Open Alerts
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-amber-400">
              {activeAlerts.length}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Threshold breach incidents
            </p>
          </CardContent>
        </Card>

        {/* Metric 4: Reverse Proxy */}
        <Card className="bg-slate-900/80 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Nginx Gateway
            </CardTitle>
            <Server className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-indigo-300">
              PORT 80
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Unified reverse proxy routing
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Fleet Vehicles Status Slice */}
      <Card className="bg-slate-900/90 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base text-slate-100">Fleet Roster</CardTitle>
            <CardDescription>
              Real-time vehicle status and telemetry ingestion through Telemetry Service
            </CardDescription>
          </div>
          <Link href="/vehicles">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-blue-400">
              All Vehicles <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoadingVehicles ? (
            <ScreenLoader title="Querying vehicles from Telemetry Service..." />
          ) : vehiclesError ? (
            <ErrorState
              title="Unable to connect to Telemetry Service"
              error={vehiclesError as Error}
              onRetry={() => refetchVehicles()}
            />
          ) : vehicles.length === 0 ? (
            <EmptyState
              title="No vehicles found"
              description="Start the stateful vehicle simulator or register a vehicle to begin streaming."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400 bg-slate-950/40">
                  <tr>
                    <th className="px-4 py-3">Vehicle</th>
                    <th className="px-4 py-3">VIN</th>
                    <th className="px-4 py-3">License Plate</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {vehicles.map((v) => (
                    <tr key={v._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-white">
                        {v.year} {v.make} {v.model}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        {v.vin}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-300">
                        {v.licensePlate}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={v.status === "ACTIVE" ? "success" : "secondary"}
                        >
                          {v.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/vehicles/${v._id}`}>
                          <Button size="sm" variant="outline" className="text-xs h-7">
                            Telemetry View
                          </Button>
                        </Link>
                      </td>
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
