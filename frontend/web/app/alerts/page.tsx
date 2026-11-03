"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScreenLoader, ErrorState, EmptyState } from "@/components/ui/states";
import { formatDateTime } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  RefreshCw,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

export default function AlertsPage() {
  const [statusFilter, setStatusFilter] = useState<"OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "">("OPEN");
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const queryClient = useQueryClient();

  const {
    data: alertsResponse,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["alerts", { status: statusFilter, severity: severityFilter }],
    queryFn: () =>
      api.alerts.getIncidents({
        status: statusFilter || undefined,
        severity: severityFilter || undefined,
      }),
    refetchInterval: 5000,
  });

  // Acknowledge Incident Mutation
  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => api.alerts.acknowledgeIncident(id, "dashboard-operator"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["active-alerts"] });
    },
  });

  // Resolve Incident Mutation
  const resolveMutation = useMutation({
    mutationFn: (id: string) => api.alerts.resolveIncident(id, "dashboard-operator"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["active-alerts"] });
    },
  });

  const incidents = alertsResponse?.data || [];

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return <Badge variant="destructive">CRITICAL</Badge>;
      case "HIGH":
        return <Badge variant="destructive" className="bg-rose-900/40 text-rose-300">HIGH</Badge>;
      case "MEDIUM":
        return <Badge variant="warning">MEDIUM</Badge>;
      default:
        return <Badge variant="secondary">LOW</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            Alert Incidents
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time threshold breaches evaluated by Alert Service from Kafka streaming events.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="bg-slate-900/60 border-slate-800">
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-xs text-slate-400 uppercase font-semibold">Filter Status:</span>
          </div>
          <div className="flex gap-2">
            {(["", "OPEN", "ACKNOWLEDGED", "RESOLVED"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800/80 text-slate-300 hover:bg-slate-800"
                }`}
              >
                {s === "" ? "ALL" : s}
              </button>
            ))}
          </div>

          <div className="ms-auto flex items-center gap-2">
            <span className="text-xs text-slate-400 uppercase font-semibold">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Incidents List */}
      <Card className="bg-slate-900/80 border-slate-800">
        <CardContent className="p-0">
          {isLoading ? (
            <ScreenLoader title="Retrieving alert incidents from MySQL..." className="py-16" />
          ) : error ? (
            <div className="p-6">
              <ErrorState
                title="Failed to load alert incidents"
                error={error as Error}
                onRetry={() => refetch()}
              />
            </div>
          ) : incidents.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<ShieldAlert className="h-10 w-10 text-emerald-500" />}
                title="No incidents found"
                description={
                  statusFilter === "OPEN"
                    ? "No open alerts currently active across the fleet. All metrics normal."
                    : "No incidents match the selected filter criteria."
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400 bg-slate-950/60">
                  <tr>
                    <th className="px-5 py-3.5">Severity</th>
                    <th className="px-5 py-3.5">Rule / Summary</th>
                    <th className="px-5 py-3.5">Vehicle</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Triggered Time</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {incidents.map((incident) => (
                    <tr key={incident.id} className="hover:bg-slate-800/30">
                      <td className="px-5 py-3.5">{getSeverityBadge(incident.severity)}</td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-white">{incident.summary}</div>
                        <div className="text-xs font-mono text-slate-400 mt-0.5">
                          Code: {incident.ruleCode} | Events: {incident.eventsCount}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/vehicles/${incident.vehicleId}`}
                          className="font-mono text-xs text-blue-400 hover:underline flex items-center gap-1"
                        >
                          {incident.vehicleId.slice(0, 8)}... <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge
                          variant={
                            incident.status === "OPEN"
                              ? "destructive"
                              : incident.status === "ACKNOWLEDGED"
                              ? "warning"
                              : "success"
                          }
                        >
                          {incident.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-400">
                        {formatDateTime(incident.lastTriggeredAt)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex gap-2">
                          {incident.status === "OPEN" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => acknowledgeMutation.mutate(incident.id)}
                              disabled={acknowledgeMutation.isPending}
                              className="text-xs h-7"
                            >
                              Acknowledge
                            </Button>
                          )}
                          {incident.status !== "RESOLVED" && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => resolveMutation.mutate(incident.id)}
                              disabled={resolveMutation.isPending}
                              className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700"
                            >
                              Resolve
                            </Button>
                          )}
                        </div>
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

