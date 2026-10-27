"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Shelter } from "@rakkhanet/shared-types";
import { geoPointToLatLng } from "@/lib/geo";
import { RecenterOnChange } from "@/components/map/recenter-on-change";

// Hex approximations of the --risk-* CSS tokens -- Leaflet's SVG attributes
// can't resolve CSS custom properties, so these are kept in sync by hand.
const STATUS_COLOR: Record<Shelter["status"], string> = {
  open: "#22C55E",
  full: "#F0B429",
  closed: "#94A3B8",
};

function makeShelterIcon(status: Shelter["status"]) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${STATUS_COLOR[status]};width:16px;height:16px;border-radius:9999px;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

// Built once per status. A new icon object on every render makes
// react-leaflet re-apply the icon to every marker each time the page
// re-renders (GPS status change, data refresh, ...) for no visible reason.
const SHELTER_ICONS: Record<Shelter["status"], L.DivIcon> = {
  open: makeShelterIcon("open"),
  full: makeShelterIcon("full"),
  closed: makeShelterIcon("closed"),
};

export function ShelterMap({
  shelters,
  center,
}: {
  shelters: Shelter[];
  center: [number, number];
}) {
  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterOnChange center={center} />
      {shelters.map((shelter) => (
        <Marker
          key={shelter._id}
          position={geoPointToLatLng(shelter.location)}
          icon={SHELTER_ICONS[shelter.status]}
        >
          <Popup>
            <div className="space-y-1">
              <p className="font-semibold">{shelter.name}</p>
              <p className="text-sm text-muted-foreground">{shelter.address}</p>
              <p className="text-sm">
                Occupancy: {shelter.currentOccupancy} / {shelter.capacity}
              </p>
              <p className="text-sm capitalize">Status: {shelter.status}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
