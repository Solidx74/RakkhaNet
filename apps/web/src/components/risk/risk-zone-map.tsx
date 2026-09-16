"use client";

import { MapContainer, TileLayer, Polygon, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { RiskZone } from "@rakkhanet/shared-types";
import { geoPolygonToLatLngs } from "@/lib/geo";

const RISK_COLOR: Record<RiskZone["riskLevel"], string> = {
  low: "#22C55E",
  medium: "#F0B429",
  high: "#EA580C",
  severe: "#DC2626",
};

export function RiskZoneMap({
  riskZones,
  center,
}: {
  riskZones: RiskZone[];
  center: [number, number];
}) {
  return (
    <MapContainer
      center={center}
      zoom={9}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {riskZones.map((zone) => (
        <Polygon
          key={zone._id}
          positions={geoPolygonToLatLngs(zone.geometry)}
          pathOptions={{
            color: RISK_COLOR[zone.riskLevel],
            fillColor: RISK_COLOR[zone.riskLevel],
            fillOpacity: 0.35,
            weight: 2,
          }}
        >
          <Popup>
            <div className="space-y-1">
              <p className="font-semibold">{zone.region}</p>
              <p className="text-sm capitalize">
                {zone.hazardType} risk:{" "}
                <strong className="capitalize">{zone.riskLevel}</strong> (
                {zone.riskScore}/100)
              </p>
            </div>
          </Popup>
        </Polygon>
      ))}
    </MapContainer>
  );
}
