"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";

/**
 * Moves the map to `center` when the COORDINATES change -- not merely when a
 * new array with the same numbers is passed in. react-leaflet's
 * <MapContainer center> is only read once, when the map is first created, so
 * a location that arrives or changes later (GPS, a saved location, a manual
 * choice) needs this to be followed.
 *
 * Depending on the numbers rather than the array matters: a parent that
 * rebuilds `center` on every render would otherwise snap the map back each
 * time, undoing whatever the person has panned to. The zoom level is kept.
 *
 * Must be rendered inside <MapContainer>.
 */
export function RecenterOnChange({ center }: { center: [number, number] }) {
  const map = useMap();
  const [lat, lng] = center;
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
}
