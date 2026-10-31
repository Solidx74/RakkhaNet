"use client";

import { useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { OfflineBanner } from "@/components/offline-banner";
import { LocationNotice } from "@/components/location/location-notice";
import { useOfflineData } from "@/hooks/use-offline-data";
import { useGeolocation } from "@/hooks/use-geolocation";
import { fetchNearbyShelters } from "@/lib/api";
import { geoPointToLatLng } from "@/lib/geo";
import {
  compassBearing,
  formatDistance,
  haversineDistanceKm,
} from "@/lib/geo-math";

const ShelterMap = dynamic(
  () => import("@/components/shelters/shelter-map").then((m) => m.ShelterMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading map...
      </div>
    ),
  },
);

export default function SheltersPage() {
  const { position, ready, source } = useGeolocation();
  // Cache key includes a rounded position so different areas get their own
  // cache entry, and a real geolocation result (vs. the fallback) triggers
  // a fresh fetch instead of silently reusing Chattogram-center results.
  // It is null until the saved location has been read from the device, so
  // no request goes out for the Chattogram default while the app is still
  // working out where you are.
  const cacheKey = ready
    ? `shelters-near-${position[0].toFixed(2)}-${position[1].toFixed(2)}`
    : null;
  const fetcher = useCallback(
    () => fetchNearbyShelters(position[0], position[1]),
    [position],
  );
  const {
    data: shelters,
    loading,
    isStale,
    cachedAt,
    error,
    refresh,
  } = useOfflineData(cacheKey, fetcher);

  // Distance and direction are worked out here, on the device, from the
  // location and the saved shelter list -- so they still work with no
  // connection (GPS needs none). They are NOT shown for the Chattogram
  // default: that would be distance from a place you aren't.
  const hasRealLocation = source !== "fallback";
  const rows = useMemo(() => {
    const list = (shelters ?? []).map((shelter) => {
      const [lat, lng] = geoPointToLatLng(shelter.location);
      return {
        shelter,
        km: hasRealLocation
          ? haversineDistanceKm(position[0], position[1], lat, lng)
          : null,
        direction: hasRealLocation
          ? compassBearing(position[0], position[1], lat, lng)
          : null,
      };
    });
    // Nearest first. Without a real location, keep the order the API gave.
    if (hasRealLocation) list.sort((a, b) => (a.km ?? 0) - (b.km ?? 0));
    return list;
  }, [shelters, position, hasRealLocation]);
  const nearestOpen =
    rows.find((r) => r.shelter.status === "open" && r.km !== null) ?? null;

  if (error && !shelters) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <PageHeader
          icon={MapPin}
          title="Shelter Locator"
          description="Find the nearest open shelter and check its current capacity."
        />
        <LocationNotice variant="browse" />
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <p>
            Couldn&apos;t load shelter data, and nothing is cached yet for this
            area.
          </p>
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <PageHeader
        icon={MapPin}
        title="Shelter Locator"
        description="Find the nearest open shelter and check its current capacity."
      />

      <LocationNotice variant="browse" />

      {isStale && <OfflineBanner cachedAt={cachedAt} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="h-[500px] overflow-hidden rounded-lg border">
          {loading && !shelters ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Loading shelters...
            </div>
          ) : (
            <ShelterMap shelters={shelters ?? []} center={position} />
          )}
        </div>

        <div className="space-y-3">
          <h2 className="font-medium">
            {shelters?.length ?? 0} shelter{shelters?.length === 1 ? "" : "s"}{" "}
            nearby
          </h2>
          {hasRealLocation && rows.length > 0 && (
            <>
              {nearestOpen && nearestOpen.km !== null ? (
                <Link
                  href={`/shelters/${nearestOpen.shelter._id}`}
                  className="block rounded-lg border border-risk-low/40 bg-risk-low/10 p-3"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Nearest open shelter
                  </p>
                  <p className="mt-0.5 font-medium">
                    {nearestOpen.shelter.name}
                  </p>
                  <p className="text-sm">
                    <strong>{formatDistance(nearestOpen.km)}</strong>{" "}
                    {nearestOpen.direction}
                  </p>
                </Link>
              ) : (
                <p className="rounded-lg border p-3 text-sm">
                  None of the shelters listed here is marked open. The{" "}
                  <Link href="/evacuation" className="underline">
                    Evacuation page
                  </Link>{" "}
                  looks for the nearest open one, even if it is farther away.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Distances are in a straight line, not by road.
              </p>
            </>
          )}
          <div className="space-y-2">
            {rows.map(({ shelter, km, direction }) => (
              <Link
                key={shelter._id}
                href={`/shelters/${shelter._id}`}
                className="block rounded-lg border p-3 hover:border-primary/40"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">{shelter.name}</p>
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-xs font-medium " +
                      (shelter.status === "open"
                        ? "bg-risk-low/15 text-risk-low"
                        : shelter.status === "full"
                          ? "bg-risk-medium/15 text-risk-medium-foreground"
                          : "bg-muted text-muted-foreground")
                    }
                  >
                    {shelter.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {shelter.address}
                </p>
                {km !== null && direction && (
                  <p className="mt-1 text-sm">
                    <strong>{formatDistance(km)}</strong> {direction}
                  </p>
                )}
                <p className="mt-1 text-sm">
                  {shelter.currentOccupancy} / {shelter.capacity} occupied
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
