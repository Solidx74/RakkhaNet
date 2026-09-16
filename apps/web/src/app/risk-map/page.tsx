"use client";

import dynamic from "next/dynamic";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { OfflineBanner } from "@/components/offline-banner";
import { useOfflineData } from "@/hooks/use-offline-data";
import { useGeolocation } from "@/hooks/use-geolocation";
import { fetchRiskZones } from "@/lib/api";

const RiskZoneMap = dynamic(
  () => import("@/components/risk/risk-zone-map").then((m) => m.RiskZoneMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading map...
      </div>
    ),
  },
);

const LEGEND = [
  { level: "low", label: "Low", className: "bg-risk-low" },
  { level: "medium", label: "Medium", className: "bg-risk-medium" },
  { level: "high", label: "High", className: "bg-risk-high" },
  { level: "severe", label: "Severe", className: "bg-risk-severe" },
];

export default function RiskMapPage() {
  const { position } = useGeolocation();
  const {
    data: riskZones,
    loading,
    isStale,
    cachedAt,
    error,
    refresh,
  } = useOfflineData("risk-zones", fetchRiskZones);

  if (error && !riskZones) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <PageHeader
          icon={AlertTriangle}
          title="Flood & Cyclone Risk Map"
          description="Current risk level by area, updated from rainfall, river level, and elevation data."
        />
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <p>
            Couldn&apos;t load Flood & Cyclone Risk Map, and nothing is cached
            yet for this area.
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
        icon={AlertTriangle}
        title="Flood & Cyclone Risk Map"
        description="Current risk level by area, updated from rainfall, river level, and elevation data."
      />

      {isStale && <OfflineBanner cachedAt={cachedAt} />}

      <div className="mb-4 flex flex-wrap items-center gap-4 text-sm">
        {LEGEND.map((item) => (
          <div key={item.level} className="flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded-full ${item.className}`} />
            {item.label}
          </div>
        ))}
      </div>

      <div className="h-[500px] overflow-hidden rounded-lg border">
        {loading && !riskZones ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Loading risk data...
          </div>
        ) : (
          <RiskZoneMap riskZones={riskZones ?? []} center={position} />
        )}
      </div>
    </div>
  );
}
