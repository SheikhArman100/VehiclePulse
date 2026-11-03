"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScreenLoader, ErrorState, EmptyState } from "@/components/ui/states";
import { Search, Filter, Truck, ArrowRight, RefreshCw, Plus } from "lucide-react";

export default function VehiclesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const {
    data: vehiclesResponse,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["vehicles", { page, limit, searchTerm, status: statusFilter }],
    queryFn: () =>
      api.telemetry.getVehicles({
        page,
        limit,
        searchTerm: searchTerm.trim() || undefined,
        status: statusFilter || undefined,
      }),
  });

  const vehicles = vehiclesResponse?.data || [];
  const meta = vehiclesResponse?.meta;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Truck className="h-6 w-6 text-blue-500" />
            Fleet Vehicles
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Registered vehicle inventory, active GPS telemetry statuses, and hardware IDs.
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

      {/* Filter and Search Bar */}
      <Card className="bg-slate-900/60 border-slate-800">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by VIN, make, model, license plate..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vehicles Table */}
      <Card className="bg-slate-900/80 border-slate-800">
        <CardContent className="p-0">
          {isLoading ? (
            <ScreenLoader title="Loading fleet vehicles..." className="py-16" />
          ) : error ? (
            <div className="p-6">
              <ErrorState
                title="Failed to load fleet vehicles"
                error={error as Error}
                onRetry={() => refetch()}
              />
            </div>
          ) : vehicles.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No vehicles match your search"
                description="Try clearing your search terms or verify the telemetry generator is registered."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400 bg-slate-950/60">
                  <tr>
                    <th className="px-5 py-3.5">Vehicle</th>
                    <th className="px-5 py-3.5">VIN</th>
                    <th className="px-5 py-3.5">License Plate</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Year</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {vehicles.map((v) => (
                    <tr
                      key={v._id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-3.5 font-medium text-white">
                        {v.make} {v.model}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-400">
                        {v.vin}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-300">
                        {v.licensePlate}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge
                          variant={
                            v.status === "ACTIVE"
                              ? "success"
                              : v.status === "MAINTENANCE"
                              ? "warning"
                              : "secondary"
                          }
                        >
                          {v.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-slate-400">{v.year}</td>
                      <td className="px-5 py-3.5 text-right">
                        <Link href={`/vehicles/${v._id}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8 gap-1.5"
                          >
                            Live Telemetry <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {meta && (meta.totalPage || 1) > 1 && (
            <div className="flex items-center justify-between border-t border-slate-800 px-5 py-3">
              <span className="text-xs text-slate-400">
                Page {meta.page} of {meta.totalPage} ({meta.total} total)
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="text-xs h-8"
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={meta.totalPage ? page >= meta.totalPage : true}
                  className="text-xs h-8"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

