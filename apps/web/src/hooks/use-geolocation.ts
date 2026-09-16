"use client";

import { useEffect, useState } from "react";

// Chattogram city center -- shown when geolocation is denied/unavailable so
// the map still shows something relevant instead of the whole globe.
const FALLBACK_LOCATION: [number, number] = [22.3569, 91.7832];

export function useGeolocation() {
  const [position, setPosition] = useState<[number, number]>(FALLBACK_LOCATION);
  const [isFallback, setIsFallback] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        setIsFallback(false);
      },
      () => {
        // Denied or unavailable -- stay on the fallback, no error shown.
      },
      { timeout: 8000 },
    );
  }, []);

  return { position, isFallback };
}
