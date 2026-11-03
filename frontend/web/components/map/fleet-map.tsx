"use client";

import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import { Vehicle, VehicleRealtimeState, VehicleTelemetryPoint } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatSpeed, formatPercent, formatDateTime } from "@/lib/utils";
import { ArrowRight, Gauge, Fuel, Compass, AlertCircle } from "lucide-react";

// Fix standard Leaflet default icon issues in Next.js bundlers
const createVehicleIcon = (status: "ONLINE" | "OFFLINE", heading = 0) => {
  const color = status === "ONLINE" ? "#10b981" : "#64748b";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <circle cx="12" cy="12" r="10" fill="${color}" fill-opacity="0.25" stroke="${color}" stroke-width="2"/>
      <polygon points="12,4 18,18 12,14 6,18" fill="${color}" transform="rotate(${heading} 12 12)"/>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: "vehicle-custom-pin",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

function MapRecenter({
  center,
}: {
  center: [number, number];
}) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

interface VehicleMapProps {
  vehicles: Vehicle[];
  vehicleStates: Record<string, VehicleRealtimeState>;
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string) => void;
  historyPoints?: VehicleTelemetryPoint[];
}

export default function FleetLeafletMap({
  vehicles,
  vehicleStates,
  selectedVehicleId,
  onSelectVehicle,
  historyPoints = [],
}: VehicleMapProps) {
  // Default map center: e.g. San Francisco or first available vehicle coordinate
  const defaultCenter: [number, number] = [37.7749, -122.4194];

  // Calculate center based on selected vehicle or first online vehicle
  const activeCoordinates: [number, number] | null = (() => {
    if (selectedVehicleId && vehicleStates[selectedVehicleId]?.location) {
      const loc = vehicleStates[selectedVehicleId].location;
      return [loc.latitude, loc.longitude];
    }
    const firstOnline = Object.values(vehicleStates).find(
      (s) => s.location?.latitude && s.location?.longitude
    );
    if (firstOnline) {
      return [firstOnline.location.latitude, firstOnline.location.longitude];
    }
    return null;
  })();

  const mapCenter = activeCoordinates || defaultCenter;

  // History path coordinates for selected vehicle
  const historyCoordinates: [number, number][] = historyPoints
    .filter((pt) => pt.location?.coordinates)
    .map((pt) => [pt.location.coordinates[1], pt.location.coordinates[0]]);

  return (
    <div className="relative w-full h-[620px] rounded-xl overflow-hidden border border-slate-800">
      <MapContainer
        center={mapCenter}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full z-10"
      >
        {activeCoordinates && <MapRecenter center={activeCoordinates} />}

        {/* Free OpenStreetMap Tiles with proper attribution */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Trail path if selected vehicle has history */}
        {historyCoordinates.length > 1 && (
          <Polyline
            positions={historyCoordinates}
            pathOptions={{
              color: "#3b82f6",
              weight: 3,
              opacity: 0.8,
              dashArray: "6, 8",
            }}
          />
        )}

        {/* Vehicle markers on map */}
        {vehicles.map((vehicle) => {
          const state = vehicleStates[vehicle._id];
          if (!state?.location?.latitude || !state?.location?.longitude) {
            return null;
          }

          const isOnline = state.status === "ONLINE";
          const icon = createVehicleIcon(
            isOnline ? "ONLINE" : "OFFLINE",
            state.location.heading || 0
          );

          return (
            <Marker
              key={vehicle._id}
              position={[state.location.latitude, state.location.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectVehicle(vehicle._id),
              }}
            >
              <Popup>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                    <span className="font-bold text-white text-sm">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </span>
                    <Badge variant={isOnline ? "success" : "secondary"}>
                      {state.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                    <div className="flex items-center gap-1.5 text-blue-400">
                      <Gauge className="h-3.5 w-3.5" />
                      <span>{formatSpeed(state.metrics?.speedKmh)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-amber-400">
                      <Fuel className="h-3.5 w-3.5" />
                      <span>{formatPercent(state.metrics?.fuelLevelPct)}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                    <div>VIN: <span className="font-mono text-slate-300">{vehicle.vin}</span></div>
                    <div>Updated: {formatDateTime(state.timestamp)}</div>
                  </div>

                  <div className="pt-2">
                    <Link href={`/vehicles/${vehicle._id}`}>
                      <Button size="sm" variant="outline" className="w-full text-xs h-7 gap-1">
                        View Full Telemetry <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating Free Map Usage Notice */}
      <div className="absolute bottom-2 left-2 z-20 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] text-slate-400">
        <span>Cartography: </span>
        <span className="text-slate-200">OpenStreetMap Free Tile Server</span>
        <span className="hidden sm:inline"> (Subject to OSM tile usage policies)</span>
      </div>
    </div>
  );
}

