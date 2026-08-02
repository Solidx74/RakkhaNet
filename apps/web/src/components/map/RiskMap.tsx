"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, Polygon, Popup, useMap } from "react-leaflet";

export interface RiskZoneItem {
  _id: string;
  title: string;
  district: string;
  division: string;
  disasterType: "FLOOD" | "CYCLONE" | "LANDSLIDE" | "STORM_SURGE";
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  riskScore: number;
  rainfallMm24h?: number;
  riverWaterLevelMeters?: number;
  elevationMeters?: number;
  warningLevel?: string;
  affectedPopEstimate?: number;
  geometry: {
    type: "Polygon";
    coordinates: number[][][]; // [[[lng, lat], ...]]
  };
  isActive: boolean;
  updatedAt: string | Date;
}

interface RiskMapProps {
  riskZones: RiskZoneItem[];
  selectedZoneId?: string | null;
  onSelectZone?: (zone: RiskZoneItem) => void;
}

function MapController({ selectedCoords }: { selectedCoords?: [number, number] | null }) {
  const map = useMap();

  useEffect(() => {
    if (selectedCoords) {
      map.flyTo(selectedCoords, 10, { duration: 1.5 });
    }
  }, [selectedCoords, map]);

  return null;
}

export default function RiskMap({ riskZones, selectedZoneId, onSelectZone }: RiskMapProps) {
  const defaultCenter: [number, number] = [23.6850, 90.3563]; // Bangladesh center

  const selectedZone = riskZones.find((z) => z._id === selectedZoneId);
  const selectedCoords: [number, number] | null = selectedZone?.geometry?.coordinates?.[0]?.[0]
    ? [selectedZone.geometry.coordinates[0][0][1], selectedZone.geometry.coordinates[0][0][0]]
    : null;

  const getRiskColors = (riskLevel: string) => {
    switch (riskLevel) {
      case "CRITICAL":
        return { color: "#f43f5e", fillColor: "#f43f5e", fillOpacity: 0.45 }; // Red
      case "HIGH":
        return { color: "#f97316", fillColor: "#f97316", fillOpacity: 0.40 }; // Orange
      case "MEDIUM":
        return { color: "#eab308", fillColor: "#eab308", fillOpacity: 0.35 }; // Yellow
      case "LOW":
      default:
        return { color: "#10b981", fillColor: "#10b981", fillOpacity: 0.25 }; // Green
    }
  };

  return (
    <div className="w-full h-full min-h-[480px] rounded-xl overflow-hidden border border-gray-800 shadow-2xl relative">
      <MapContainer
        center={defaultCenter}
        zoom={7}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%", backgroundColor: "#0d1117" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
        />

        <MapController selectedCoords={selectedCoords} />

        {/* GeoJSON Polygon Hazard Layers */}
        {riskZones.map((zone) => {
          if (!zone.geometry || zone.geometry.type !== "Polygon") return null;

          // Convert GeoJSON [lng, lat] to Leaflet [lat, lng] format
          const leafletPositions: [number, number][] = zone.geometry.coordinates[0].map(
            (coord) => [coord[1], coord[0]]
          );

          const colors = getRiskColors(zone.riskLevel);
          const isSelected = selectedZoneId === zone._id;

          return (
            <Polygon
              key={zone._id}
              positions={leafletPositions}
              pathOptions={{
                color: isSelected ? "#3b82f6" : colors.color,
                fillColor: colors.fillColor,
                fillOpacity: isSelected ? 0.65 : colors.fillOpacity,
                weight: isSelected ? 4 : 2,
              }}
              eventHandlers={{
                click: () => onSelectZone?.(zone),
              }}
            >
              <Popup>
                <div className="p-2 text-xs space-y-2 max-w-[260px]">
                  <div className="flex items-center justify-between border-b pb-1.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-800">
                      {zone.disasterType}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded text-white ${
                        zone.riskLevel === "CRITICAL"
                          ? "bg-red-600"
                          : zone.riskLevel === "HIGH"
                          ? "bg-orange-500"
                          : zone.riskLevel === "MEDIUM"
                          ? "bg-yellow-500 text-black"
                          : "bg-emerald-600"
                      }`}
                    >
                      {zone.riskLevel} ({zone.riskScore}/100)
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-gray-900 leading-snug">{zone.title}</h4>
                    <p className="text-gray-500 text-[11px] mt-0.5">{zone.district}, {zone.division} Division</p>
                  </div>

                  {zone.warningLevel && (
                    <div className="bg-rose-50 text-rose-700 p-1.5 rounded font-medium text-[11px]">
                      ⚠️ {zone.warningLevel}
                    </div>
                  )}

                  {/* Weather Indicators */}
                  <div className="grid grid-cols-2 gap-1.5 bg-gray-50 p-2 rounded text-[10px] text-gray-700 font-mono">
                    <div>🌧️ Rain: <strong>{zone.rainfallMm24h ?? 0} mm</strong></div>
                    <div>🌊 River: <strong>+{zone.riverWaterLevelMeters ?? 0}m</strong></div>
                    <div className="col-span-2">👥 Est. Affected: <strong>{zone.affectedPopEstimate?.toLocaleString() || 0}</strong></div>
                  </div>

                  <div className="text-[10px] text-gray-400 border-t pt-1">
                    Last Updated: {new Date(zone.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </Popup>
            </Polygon>
          );
        })}
      </MapContainer>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 right-4 z-[400] bg-gray-900/90 border border-gray-800 backdrop-blur-md p-3 rounded-xl text-xs space-y-1.5 text-gray-300 shadow-xl">
        <p className="font-bold text-white text-[11px]">Risk Level Legend</p>
        <div className="flex items-center space-x-2">
          <span className="w-3.5 h-3.5 rounded bg-rose-500/80 border border-rose-400" />
          <span>Critical / Severe (Score 85+)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3.5 h-3.5 rounded bg-orange-500/80 border border-orange-400" />
          <span>High Risk (Score 70-84)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3.5 h-3.5 rounded bg-amber-500/80 border border-amber-400" />
          <span>Medium Risk (Score 45-69)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3.5 h-3.5 rounded bg-emerald-500/80 border border-emerald-400" />
          <span>Low Risk (&lt; 45)</span>
        </div>
      </div>
    </div>
  );
}
