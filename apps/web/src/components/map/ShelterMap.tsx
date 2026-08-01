"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

export interface ShelterItem {
  _id: string;
  name: string;
  code?: string;
  location: { type: "Point"; coordinates: [number, number] }; // [lng, lat]
  address: string;
  division: string;
  district: string;
  upazila: string;
  capacity: number;
  currentOccupancy: number;
  status: "OPEN" | "FULL" | "CLOSED" | "INACCESSIBLE";
  amenities: {
    hasCleanWater: boolean;
    hasElectricity: boolean;
    hasGenerator: boolean;
    hasMedicalFacility: boolean;
    separateWomenSpace: boolean;
  };
  contactPerson: {
    name: string;
    phone: string;
  };
  distanceMeters?: number;
  availableCapacity?: number;
  occupancyPercentage?: number;
}

interface ShelterMapProps {
  shelters: ShelterItem[];
  userLocation: { lat: number; lng: number } | null;
  selectedShelterId?: string | null;
  onSelectShelter?: (shelter: ShelterItem) => void;
}

function MapController({ center, selectedCoords }: { center: [number, number]; selectedCoords?: [number, number] | null }) {
  const map = useMap();

  useEffect(() => {
    if (selectedCoords) {
      map.flyTo(selectedCoords, 14, { duration: 1.5 });
    } else if (center) {
      map.panTo(center);
    }
  }, [center, selectedCoords, map]);

  return null;
}

export default function ShelterMap({ shelters, userLocation, selectedShelterId, onSelectShelter }: ShelterMapProps) {
  const defaultCenter: [number, number] = userLocation 
    ? [userLocation.lat, userLocation.lng] 
    : [23.6850, 90.3563]; // Default Bangladesh center

  const selectedShelter = shelters.find(s => s._id === selectedShelterId);
  const selectedCoords: [number, number] | null = selectedShelter
    ? [selectedShelter.location.coordinates[1], selectedShelter.location.coordinates[0]]
    : null;

  const getMarkerColor = (shelter: ShelterItem) => {
    if (shelter.status === "CLOSED" || shelter.status === "INACCESSIBLE") return "#6b7280"; // Gray
    if (shelter.status === "FULL") return "#f43f5e"; // Red
    const occPct = shelter.occupancyPercentage ?? Math.round((shelter.currentOccupancy / shelter.capacity) * 100);
    if (occPct >= 90) return "#f43f5e"; // Red
    if (occPct >= 75) return "#f59e0b"; // Yellow
    return "#10b981"; // Green
  };

  return (
    <div className="w-full h-full min-h-[450px] rounded-xl overflow-hidden border border-gray-800 shadow-2xl relative">
      <MapContainer
        center={defaultCenter}
        zoom={userLocation ? 11 : 7}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%", backgroundColor: "#0d1117" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
        />

        <MapController center={defaultCenter} selectedCoords={selectedCoords} />

        {/* User Geolocation Pulse Marker */}
        {userLocation && (
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={10}
            pathOptions={{
              color: "#3b82f6",
              fillColor: "#60a5fa",
              fillOpacity: 0.8,
              weight: 3,
            }}
          >
            <Popup className="dark-popup">
              <div className="p-1 text-xs">
                <p className="font-bold text-blue-600">Your Detected Geolocation</p>
                <p className="text-gray-600 font-mono">
                  [{userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}]
                </p>
              </div>
            </Popup>
          </CircleMarker>
        )}

        {/* Shelter Markers */}
        {shelters.map((shelter) => {
          const lat = shelter.location.coordinates[1];
          const lng = shelter.location.coordinates[0];
          const color = getMarkerColor(shelter);
          const occPct = shelter.occupancyPercentage ?? Math.round((shelter.currentOccupancy / shelter.capacity) * 100);
          const availCap = shelter.availableCapacity ?? Math.max(0, shelter.capacity - shelter.currentOccupancy);

          return (
            <CircleMarker
              key={shelter._id}
              center={[lat, lng]}
              radius={selectedShelterId === shelter._id ? 14 : 9}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.85,
                weight: selectedShelterId === shelter._id ? 4 : 2,
              }}
              eventHandlers={{
                click: () => onSelectShelter?.(shelter),
              }}
            >
              <Popup>
                <div className="p-2 text-xs space-y-2 max-w-[240px]">
                  <div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold">
                      {shelter.code || "SHELTER"}
                    </span>
                    <h4 className="font-bold text-sm text-gray-900 mt-1">{shelter.name}</h4>
                    <p className="text-gray-500">{shelter.address}, {shelter.upazila}, {shelter.district}</p>
                  </div>

                  {/* Distance badge */}
                  {shelter.distanceMeters !== undefined && (
                    <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium text-[11px]">
                      📍 {(shelter.distanceMeters / 1000).toFixed(1)} km away
                    </div>
                  )}

                  {/* Capacity Bar */}
                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-gray-700 mb-1">
                      <span>Occupancy ({occPct}%)</span>
                      <span>{shelter.currentOccupancy} / {shelter.capacity}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${occPct}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Available Space: <span className="font-bold text-gray-800">{availCap} persons</span>
                    </p>
                  </div>

                  {/* Amenities */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {shelter.amenities.hasCleanWater && <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[9px]">💧 Water</span>}
                    {shelter.amenities.hasElectricity && <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px]">⚡ Power</span>}
                    {shelter.amenities.hasGenerator && <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 text-[9px]">🔋 Gen</span>}
                    {shelter.amenities.hasMedicalFacility && <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px]">🏥 Medical</span>}
                    {shelter.amenities.separateWomenSpace && <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[9px]">👩 Women Space</span>}
                  </div>

                  {/* Contact Person */}
                  <div className="border-t pt-1.5 mt-1 text-[10px] text-gray-600">
                    <p>Contact: <span className="font-semibold text-gray-800">{shelter.contactPerson.name}</span></p>
                    <a href={`tel:${shelter.contactPerson.phone}`} className="text-emerald-600 font-bold hover:underline">
                      📞 {shelter.contactPerson.phone}
                    </a>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 right-4 z-[400] bg-gray-900/90 border border-gray-800 backdrop-blur-md p-3 rounded-xl text-xs space-y-1.5 text-gray-300">
        <p className="font-bold text-white text-[11px]">Occupancy Status Legend</p>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>Open (&lt; 75% Capacity)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-amber-500" />
          <span>High Occupancy (75-99%)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-rose-500" />
          <span>Full / Critical (100%)</span>
        </div>
      </div>
    </div>
  );
}
