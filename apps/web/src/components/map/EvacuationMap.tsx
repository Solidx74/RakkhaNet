"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";

interface EvacuationMapProps {
  userLocation: { lat: number; lng: number };
  shelterLocation: { lat: number; lng: number; name: string; address: string };
  routeGeometry: { type: "LineString"; coordinates: number[][] }; // [[lng, lat], ...]
  routeType: "road" | "fallback";
}

function MapBoundsController({ userLocation, shelterLocation }: { userLocation: { lat: number; lng: number }; shelterLocation: { lat: number; lng: number } }) {
  const map = useMap();

  useEffect(() => {
    if (userLocation && shelterLocation) {
      const bounds = L.latLngBounds(
        [userLocation.lat, userLocation.lng],
        [shelterLocation.lat, shelterLocation.lng]
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [userLocation, shelterLocation, map]);

  return null;
}

export default function EvacuationMap({ userLocation, shelterLocation, routeGeometry, routeType }: EvacuationMapProps) {
  // Convert GeoJSON [[lng, lat], ...] to Leaflet [[lat, lng], ...]
  const polylinePositions: [number, number][] = routeGeometry.coordinates.map(
    (coord) => [coord[1], coord[0]]
  );

  return (
    <div className="w-full h-full min-h-[480px] rounded-xl overflow-hidden border border-gray-800 shadow-2xl relative">
      <MapContainer
        center={[userLocation.lat, userLocation.lng]}
        zoom={12}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%", backgroundColor: "#0d1117" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
        />

        <MapBoundsController userLocation={userLocation} shelterLocation={shelterLocation} />

        {/* Route Polyline */}
        <Polyline
          positions={polylinePositions}
          pathOptions={{
            color: routeType === "road" ? "#10b981" : "#f59e0b", // Emerald for road, Amber for fallback
            weight: routeType === "road" ? 6 : 4,
            dashArray: routeType === "fallback" ? "8, 8" : undefined,
            opacity: 0.9,
          }}
        />

        {/* User Geolocation Start Marker */}
        <CircleMarker
          center={[userLocation.lat, userLocation.lng]}
          radius={11}
          pathOptions={{
            color: "#3b82f6",
            fillColor: "#60a5fa",
            fillOpacity: 0.9,
            weight: 3,
          }}
        >
          <Popup>
            <div className="p-1 text-xs">
              <p className="font-bold text-blue-600">Your Current Geolocation (Start Point)</p>
            </div>
          </Popup>
        </CircleMarker>

        {/* Destination Shelter Marker */}
        <CircleMarker
          center={[shelterLocation.lat, shelterLocation.lng]}
          radius={12}
          pathOptions={{
            color: "#10b981",
            fillColor: "#059669",
            fillOpacity: 0.9,
            weight: 3,
          }}
        >
          <Popup>
            <div className="p-1 text-xs">
              <p className="font-bold text-emerald-700">{shelterLocation.name}</p>
              <p className="text-gray-600">{shelterLocation.address}</p>
            </div>
          </Popup>
        </CircleMarker>
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-[400] bg-gray-900/90 border border-gray-800 backdrop-blur-md p-3 rounded-xl text-xs space-y-1 text-gray-300 shadow-xl">
        <p className="font-bold text-white text-[11px]">Evacuation Route Legend</p>
        <div className="flex items-center space-x-2">
          <span className="w-4 h-1 bg-emerald-500 rounded" />
          <span>Road-Aligned Safe Route (OSRM)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-4 h-1 bg-amber-500 rounded border border-dashed border-amber-300" />
          <span>Direct Safe Buffer (Fallback)</span>
        </div>
      </div>
    </div>
  );
}
