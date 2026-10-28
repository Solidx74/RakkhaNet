"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { OfflineBanner } from "@/components/offline-banner";
import { RequireRole } from "@/components/auth/require-role";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { RequestsByCategoryChart } from "@/components/dashboard/requests-by-category-chart";
import { RequestCard } from "@/components/dashboard/request-card";
import { ResourceInventory } from "@/components/dashboard/resource-inventory";
import { useOfflineData } from "@/hooks/use-offline-data";
import { useReliefRequestsLive } from "@/hooks/use-relief-requests-live";
import { useSocketConnected } from "@/hooks/use-socket-status";
import { useAppSession } from "@/hooks/use-app-session";
import {
  fetchAllReliefRequests,
  fetchAssignableVolunteers,
  fetchResources,
  fetchShelters,
  type AssignableVolunteer,
} from "@/lib/api";

/** Shown when a section failed to load AND nothing is saved on this device. */
function LoadError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <div
      className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm"
      role="alert"
    >
      <p>Couldn&apos;t load {what}, and nothing is saved on this device yet.</p>
      <button
        onClick={onRetry}
        className="mt-2 font-medium underline underline-offset-2"
      >
        Try again
      </button>
    </div>
  );
}

function DashboardContent() {
  const { data: session } = useAppSession();
  const role = (session?.user as { role?: string } | undefined)?.role as
    | "citizen"
    | "volunteer"
    | "coordinator"
    | "admin"
    | undefined;
  const currentUserId = session?.user.id;

  const {
    data: requests,
    isStale: requestsStale,
    cachedAt: requestsCachedAt,
    error: requestsError,
    refresh: refreshRequests,
  } = useOfflineData("dashboard-requests", fetchAllReliefRequests);
  const {
    data: resources,
    isStale: resourcesStale,
    cachedAt: resourcesCachedAt,
    error: resourcesError,
    refresh: refreshResources,
  } = useOfflineData("dashboard-resources", fetchResources);
  const {
    data: shelters,
    isStale: sheltersStale,
    cachedAt: sheltersCachedAt,
    error: sheltersError,
    refresh: refreshShelters,
  } = useOfflineData("dashboard-shelters", fetchShelters);

  // The assignable-volunteer list is only for coordinators/admins (the API
  // returns 403 to anyone else), so it is only fetched for them. A plain
  // fetch rather than useOfflineData: assigning is a write, so it needs a
  // connection anyway, and names of other users shouldn't sit in the
  // offline cache.
  const canAssignOthers = role === "coordinator" || role === "admin";
  const [volunteers, setVolunteers] = useState<AssignableVolunteer[]>([]);
  useEffect(() => {
    if (!canAssignOthers) return;
    let cancelled = false;
    fetchAssignableVolunteers()
      .then((list) => {
        if (!cancelled) setVolunteers(list);
      })
      .catch(() => {
        // Leave the list empty; each card then shows its assign dropdown
        // disabled rather than breaking the dashboard.
      });
    return () => {
      cancelled = true;
    };
  }, [canAssignOthers]);

  // A live "something changed" event only concerns requests and resources.
  const refreshAll = useCallback(() => {
    refreshRequests();
    refreshResources();
  }, [refreshRequests, refreshResources]);

  // Everything, for a manual refresh or after a lost connection.
  const refreshEverything = useCallback(() => {
    refreshRequests();
    refreshResources();
    refreshShelters();
  }, [refreshRequests, refreshResources, refreshShelters]);

  useReliefRequestsLive(refreshAll);

  // --- is what's on screen trustworthy? ---
  const anyStale = requestsStale || resourcesStale || sheltersStale;
  const requestsUnavailable = requestsError !== null && requests === null;
  const resourcesUnavailable =
    (resourcesError !== null && resources === null) ||
    (sheltersError !== null && shelters === null);
  const anyUnavailable = requestsUnavailable || resourcesUnavailable;

  // When the stale data was saved -- the oldest, since that is the
  // least trustworthy part of the screen.
  const staleTimes = [
    requestsStale ? requestsCachedAt : null,
    resourcesStale ? resourcesCachedAt : null,
    sheltersStale ? sheltersCachedAt : null,
  ].filter((t): t is number => typeof t === "number");
  const oldestStaleAt = staleTimes.length > 0 ? Math.min(...staleTimes) : null;

  const connected = useSocketConnected();
  const isLive = connected && !anyStale && !anyUnavailable;

  // Events sent while this device was offline are gone for good, so when the
  // connection comes back the data must be re-fetched -- otherwise the page
  // would sit on old data. It also covers a page that was opened offline
  // (stale from the start) and gets its first connection later. The very
  // first connection of a normal, fresh load does NOT trigger a re-fetch.
  const hasConnected = useRef(false);
  const missedEvents = useRef(false);
  useEffect(() => {
    if (!connected) {
      if (hasConnected.current) missedEvents.current = true;
      return;
    }
    const needsRefresh = missedEvents.current || anyStale;
    hasConnected.current = true;
    missedEvents.current = false;
    if (needsRefresh) refreshEverything();
  }, [connected, anyStale, refreshEverything]);

  const stats = useMemo(() => {
    const list = requests ?? [];
    return {
      pending: list.filter((r) => r.status === "pending").length,
      inProgress: list.filter(
        (r) => r.status === "in_progress" || r.status === "assigned",
      ).length,
      resolved: list.filter((r) => r.status === "resolved").length,
      critical: list.filter(
        (r) => r.priority === "critical" && r.status !== "resolved",
      ).length,
    };
  }, [requests]);

  if (!role || !currentUserId) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <PageHeader
            icon={LayoutDashboard}
            title="Relief Coordination Dashboard"
            description="Live view of relief requests and shelter resources."
          />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={
                isLive
                  ? "h-2 w-2 animate-pulse rounded-full bg-risk-low"
                  : "h-2 w-2 rounded-full bg-muted-foreground/50"
              }
            />
            {isLive
              ? "Live"
              : anyStale || anyUnavailable
                ? "Not live"
                : "Connecting..."}
          </span>
          {!isLive && (
            <Button size="sm" variant="outline" onClick={refreshEverything}>
              Refresh
            </Button>
          )}
        </div>
      </div>

      {anyStale && <OfflineBanner cachedAt={oldestStaleAt} />}

      {requests !== null && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <StatCard label="Pending" value={stats.pending} />
            <StatCard label="In progress" value={stats.inProgress} />
            <StatCard label="Resolved" value={stats.resolved} tone="success" />
            <StatCard
              label="Critical (open)"
              value={stats.critical}
              tone="critical"
            />
          </div>

          <div className="mt-4">
            <RequestsByCategoryChart requests={requests} />
          </div>
        </>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <h2 className="mb-2 font-medium">Relief Requests</h2>
          {requests === null ? (
            requestsUnavailable ? (
              <LoadError what="relief requests" onRetry={refreshRequests} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Loading relief requests...
              </p>
            )
          ) : (
            <div className="space-y-2">
              {requests.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No relief requests yet.
                </p>
              )}
              {requests.map((r) => (
                <RequestCard
                  key={r._id}
                  request={r}
                  currentUserId={currentUserId}
                  role={role}
                  onChanged={refreshAll}
                  volunteers={volunteers}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-2 font-medium">Shelter Resources</h2>
          {resourcesUnavailable ? (
            <LoadError
              what="shelter resources"
              onRetry={() => {
                refreshResources();
                refreshShelters();
              }}
            />
          ) : resources === null || shelters === null ? (
            <p className="text-sm text-muted-foreground">
              Loading shelter resources...
            </p>
          ) : (
            <ResourceInventory
              shelters={shelters}
              resources={resources}
              onResourceUpdated={refreshResources}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireRole roles={["volunteer", "coordinator", "admin"]}>
      <DashboardContent />
    </RequireRole>
  );
}
