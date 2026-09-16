"use client";

import { useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { OfflineBanner } from "@/components/offline-banner";
import { useOfflineData } from "@/hooks/use-offline-data";
import { useGeolocation } from "@/hooks/use-geolocation";
import { fetchNearbyShelters } from "@/lib/api";

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
  const { position } = useGeolocation();
  // Cache key includes a rounded position so different areas get their own
  // cache entry, and a real geolocation result (vs. the fallback) triggers
  // a fresh fetch instead of silently reusing Chattogram-center results.
  const cacheKey = `shelters-near-${position[0].toFixed(2)}-${position[1].toFixed(2)}`;
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

  if (error && !shelters) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <PageHeader
          icon={MapPin}
          title="Shelter Locator"
          description="Find the nearest open shelter and check its current capacity."
        />
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
          <div className="space-y-2">
            {shelters?.map((shelter) => (
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
