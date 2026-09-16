"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const userIcon = L.divIcon({
  className: "",
  html: `<div style="background:#12294B;width:14px;height:14px;border-radius:9999px;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});
const shelterIcon = L.divIcon({
  className: "",
  html: `<div style="background:#22C55E;width:16px;height:16px;border-radius:9999px;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function FitToRoute({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length < 2) return;
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
  }, [points, map]);
  return null;
}

export function EvacuationMap({
  userPosition,
  shelterPosition,
  routeGeometry,
}: {
  userPosition: [number, number];
  shelterPosition: [number, number];
  /** Real road-route points if OSRM succeeded; omitted for the straight-line fallback. */
  routeGeometry?: [number, number][];
}) {
  const linePoints = routeGeometry ?? [userPosition, shelterPosition];

  return (
    <MapContainer
      center={userPosition}
      zoom={12}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitToRoute points={linePoints} />
      <Marker position={userPosition} icon={userIcon} />
      <Marker position={shelterPosition} icon={shelterIcon} />
      <Polyline
        positions={linePoints}
        pathOptions={
          routeGeometry
            ? { color: "#12294B", weight: 4 }
            : { color: "#F0B429", weight: 4, dashArray: "8 8" }
        }
      />
    </MapContainer>
  );
}
