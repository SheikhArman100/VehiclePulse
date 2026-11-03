"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ScreenLoader, ErrorState, EmptyState } from "@/components/ui/states";
import { formatDateTime, formatSpeed, formatDistance } from "@/lib/utils";
import {
  BarChart3,
  TrendingUp,
  Map,
  Compass,
  RefreshCw,
  Gauge,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AnalyticsPage() {
  const [limit, setLimit] = useState(24);

  // Overall Fleet Summary
  const {
    data: summaryResponse,
    isLoading: isLoadingSummary,
    error: summaryError,
    refetch: refetchSummary,
    isFetching: isFetchingSummary,
  } = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: () => api.analytics.getFleetSummary(),
  });

  // Hourly Fleet Rollups (computed in PostgreSQL)
  const {
    data: hourlyResponse,
    isLoading: isLoadingHourly,
    error: hourlyError,
    refetch: refetchHourly,
  } = useQuery({
    queryKey: ["analytics-hourly", limit],
    queryFn: () => api.analytics.getHourlyRollups({ limit }),
  });

  const summary = summaryResponse?.data;
  const rollups = hourlyResponse?.data || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <BarChart3 className="h-6 w-6 text-indigo-400" />
            Analytics & Aggregations
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Aggregated trip statistics, hourly rollups, and fleet metrics computed in PostgreSQL.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchSummary();
              refetchHourly();
            }}
            disabled={isFetchingSummary}
            className="gap-2 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetchingSummary ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Aggregate KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/80 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs font-semibold uppercase text-slate-400">
              Active Fleet Size
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold font-mono text-white">
              {summary ? summary.totalActiveVehicles : "—"}
            </div>
            <span className="text-[11px] text-slate-500">Tracked in analytics</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs font-semibold uppercase text-slate-400">
              Completed Trips
            </CardTitle>
            <Map className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold font-mono text-white">
              {summary ? summary.totalTripsCompleted : "—"}
            </div>
            <span className="text-[11px] text-slate-500">Trip lifecycle transitions</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs font-semibold uppercase text-slate-400">
              Distance Traveled
            </CardTitle>
            <Compass className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold font-mono text-white">
              {summary ? formatDistance(summary.totalDistanceTraveledKm) : "—"}
            </div>
            <span className="text-[11px] text-slate-500">Total cumulative mileage</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
            <CardTitle className="text-xs font-semibold uppercase text-slate-400">
              Avg Fleet Velocity
            </CardTitle>
            <Gauge className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold font-mono text-white">
              {summary ? formatSpeed(summary.fleetAverageSpeedKmh) : "—"}
            </div>
            <span className="text-[11px] text-slate-500">Mean movement speed</span>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Rollups Table */}
      <Card className="bg-slate-900/80 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base text-white">Hourly Aggregation Buckets</CardTitle>
            <CardDescription>
              Time-bucketed aggregates processed from vehicle.telemetry.raw Kafka topic.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingHourly ? (
            <ScreenLoader title="Querying PostgreSQL hourly rollups..." className="py-16" />
          ) : hourlyError ? (
            <div className="p-6">
              <ErrorState
                title="Failed to load aggregation rollups"
                error={hourlyError as Error}
                onRetry={() => refetchHourly()}
              />
            </div>
          ) : rollups.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No hourly rollups recorded yet"
                description="Aggregations are computed as the Kafka consumer processes telemetry batches."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400 bg-slate-950/60">
                  <tr>
                    <th className="px-5 py-3.5">Time Bucket</th>
                    <th className="px-5 py-3.5">Vehicle ID</th>
                    <th className="px-5 py-3.5">Avg Speed</th>
                    <th className="px-5 py-3.5">Max Speed</th>
                    <th className="px-5 py-3.5">Distance Delta</th>
                    <th className="px-5 py-3.5 text-right">Event Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {rollups.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/30">
                      <td className="px-5 py-3 text-slate-300">{formatDateTime(r.bucketHour)}</td>
                      <td className="px-5 py-3 text-blue-400">{r.vehicleId}</td>
                      <td className="px-5 py-3 text-emerald-400">{formatSpeed(r.avgSpeedKmh)}</td>
                      <td className="px-5 py-3 text-amber-400">{formatSpeed(r.maxSpeedKmh)}</td>
                      <td className="px-5 py-3 text-slate-300">{formatDistance(r.distanceDeltaKm)}</td>
                      <td className="px-5 py-3 text-right text-indigo-400 font-bold">{r.eventsCount}</td>
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

