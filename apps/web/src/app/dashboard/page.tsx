"use client";

import { useCallback, useMemo } from "react";
import { LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RequireRole } from "@/components/auth/require-role";
import { StatCard } from "@/components/dashboard/stat-card";
import { RequestsByCategoryChart } from "@/components/dashboard/requests-by-category-chart";
import { RequestCard } from "@/components/dashboard/request-card";
import { ResourceInventory } from "@/components/dashboard/resource-inventory";
import { useOfflineData } from "@/hooks/use-offline-data";
import { useReliefRequestsLive } from "@/hooks/use-relief-requests-live";
import { authClient } from "@/lib/auth-client";
import {
  fetchAllReliefRequests,
  fetchResources,
  fetchShelters,
} from "@/lib/api";

function DashboardContent() {
  const { data: session } = authClient.useSession();
  const role = (session?.user as { role?: string } | undefined)?.role as
    | "citizen"
    | "volunteer"
    | "coordinator"
    | "admin"
    | undefined;
  const currentUserId = session?.user.id;

  const { data: requests, refresh: refreshRequests } = useOfflineData(
    "dashboard-requests",
    fetchAllReliefRequests,
  );
  const { data: resources, refresh: refreshResources } = useOfflineData(
    "dashboard-resources",
    fetchResources,
  );
  const { data: shelters } = useOfflineData(
    "dashboard-shelters",
    fetchShelters,
  );

  const refreshAll = useCallback(() => {
    refreshRequests();
    refreshResources();
  }, [refreshRequests, refreshResources]);

  useReliefRequestsLive(refreshAll);

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
        <span className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2 w-2 animate-pulse rounded-full bg-risk-low" />
          Live
        </span>
      </div>

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
        <RequestsByCategoryChart requests={requests ?? []} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <h2 className="mb-2 font-medium">Relief Requests</h2>
          <div className="space-y-2">
            {requests?.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No relief requests yet.
              </p>
            )}
            {requests?.map((r) => (
              <RequestCard
                key={r._id}
                request={r}
                currentUserId={currentUserId}
                role={role}
                onChanged={refreshAll}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-2 font-medium">Shelter Resources</h2>
          <ResourceInventory
            shelters={shelters ?? []}
            resources={resources ?? []}
            onResourceUpdated={refreshResources}
          />
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
