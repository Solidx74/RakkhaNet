"use client";

import { useCallback } from "react";
import dynamic from "next/dynamic";
import { Route, Navigation } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { LocationNotice } from "@/components/location/location-notice";
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

// The API picks the nearest OPEN shelter with no maximum distance. Beyond
// this the page says plainly that it is far, instead of drawing a route as
// if it were a short walk. 20 km matches the radius the Shelters page uses.
const FAR_KM = 20;
// Same walking speed the API uses for its straight-line estimate.
const WALKING_KMH = 4.5;

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

/** Distance to the shelter in km, whichever kind of route came back. */
function routeDistanceKm(route: EvacuationRoute): number | null {
  if (route.routeType === "driving") {
    return typeof route.distanceMeters === "number"
      ? route.distanceMeters / 1000
      : null;
  }
  return typeof route.distanceKm === "number" ? route.distanceKm : null;
}

/** Rough on-foot time for a distance, in plain words. */
function formatWalkTime(km: number): string {
  const hours = km / WALKING_KMH;
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} minutes`;
  const rounded = Math.round(hours * 2) / 2; // nearest half hour
  return rounded === 1 ? "1 hour" : `${rounded} hours`;
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
  const { position, ready, source } = useGeolocation();
  // null until the saved location has been read from the device, so no
  // request goes out for the Chattogram default while the app is still
  // working out where you are.
  const cacheKey = ready
    ? `evacuation-route-${position[0].toFixed(2)}-${position[1].toFixed(2)}`
    : null;
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
        <LocationNotice variant="browse" />
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

  // Not shown when the location is only the Chattogram default: the
  // distance would be from a position that isn't yours, and the location
  // notice above already says so.
  const distanceKm = route ? routeDistanceKm(route) : null;
  const isFar =
    distanceKm !== null && distanceKm > FAR_KM && source !== "fallback";

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

      <LocationNotice variant="browse" />

      {isStale && cachedAt && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          Couldn&apos;t reach the server, so this is a route saved on{" "}
          <strong>{new Date(cachedAt).toLocaleString()}</strong>. You may be
          offline or the server may be down. This shelter&apos;s open/full
          status may have changed since then.
        </div>
      )}

      {isFar && distanceKm !== null && (
        <div
          className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm"
          role="status"
        >
          <p>
            <strong>The nearest open shelter is far from you:</strong>{" "}
            {distanceKm.toFixed(1)} km, roughly {formatWalkTime(distanceKm)} on
            foot.
          </p>
          <p className="mt-1 text-muted-foreground">
            Only shelters marked open are used, so nearer ones may be full or
            closed. If you can&apos;t reach this one safely, contact local
            authorities or nearby volunteers for help.
          </p>
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
