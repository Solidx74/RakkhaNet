"use client";

import { useCallback } from "react";
import dynamic from "next/dynamic";
import { Route, Navigation } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useOfflineData } from "@/hooks/use-offline-data";
import { useGeolocation } from "@/hooks/use-geolocation";
import { geoPointToLatLng } from "@/lib/geo";
import type { Shelter } from "@rakkhanet/shared-types";

const EvacuationMap = dynamic(
  () =>
    import("@/components/evacuation/evacuation-map").then(
      (m) => m.EvacuationMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading map...
      </div>
    ),
  },
);

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

interface EvacuationRoute {
  shelter: Shelter;
  routeType: "driving" | "straight-line";
  distanceMeters?: number;
  durationSeconds?: number;
  geometry?: { type: "LineString"; coordinates: [number, number][] };
  roadNames?: string[];
  distanceKm?: number;
  direction?: string;
  estimatedWalkMinutes?: number;
  instructions?: string;
}

async function fetchEvacuationRoute(
  lat: number,
  lng: number,
): Promise<EvacuationRoute> {
  const res = await fetch(
    `${API_URL}/api/evacuation/route?lat=${lat}&lng=${lng}`,
    { credentials: "include" },
  );
  if (!res.ok) throw new Error("No open shelter found nearby");
  return res.json();
}

export default function EvacuationPage() {
  const { position } = useGeolocation();
  const cacheKey = `evacuation-route-${position[0].toFixed(2)}-${position[1].toFixed(2)}`;
  const fetcher = useCallback(
    () => fetchEvacuationRoute(position[0], position[1]),
    [position],
  );
  const {
    data: route,
    loading,
    isStale,
    cachedAt,
    error,
    refresh,
  } = useOfflineData(cacheKey, fetcher);

  if (error && !route) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <PageHeader
          icon={Route}
          title="Evacuation Guidance"
          description="Step-by-step directions to the nearest open shelter."
        />
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <p>Couldn&apos;t find a route, and nothing is cached yet.</p>
          <button
            onClick={refresh}
            className="mt-2 font-medium underline underline-offset-2"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const routeGeometry = route?.geometry?.coordinates.map(
    ([lng, lat]) => [lat, lng] as [number, number],
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <PageHeader
        icon={Route}
        title="Evacuation Guidance"
        description="Step-by-step directions to the nearest open shelter."
      />

      {isStale && cachedAt && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          Showing a route saved from{" "}
          <strong>{new Date(cachedAt).toLocaleString()}</strong> -- you appear
          to be offline. This shelter&apos;s open/full status may have changed
          since then.
        </div>
      )}

      {loading && !route ? (
        <div className="flex h-[400px] items-center justify-center text-muted-foreground">
          Finding the nearest open shelter...
        </div>
      ) : route ? (
        <div className="space-y-4">
          <div className="h-[400px] overflow-hidden rounded-lg border">
            <EvacuationMap
              userPosition={position}
              shelterPosition={geoPointToLatLng(route.shelter.location)}
              routeGeometry={routeGeometry}
            />
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 font-medium">
              <Navigation className="h-4 w-4 text-primary" />
              {route.shelter.name}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {route.shelter.address}
            </p>

            {route.routeType === "driving" ? (
              <div className="mt-3 space-y-1 text-sm">
                <p>
                  <strong>
                    {((route.distanceMeters ?? 0) / 1000).toFixed(1)} km
                  </strong>{" "}
                  by road, about{" "}
                  <strong>
                    {Math.round((route.durationSeconds ?? 0) / 60)} min
                  </strong>
                </p>
                {route.roadNames && route.roadNames.length > 0 && (
                  <p className="text-muted-foreground">
                    Via {route.roadNames.slice(0, 3).join(", ")}
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-3 space-y-1 text-sm">
                <p>{route.instructions}</p>
                <p className="text-muted-foreground">
                  Estimated walk: about {route.estimatedWalkMinutes} min (
                  {route.distanceKm} km)
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
