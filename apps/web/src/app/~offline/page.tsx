"use client";

import { useSyncExternalStore } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";

/**
 * Shown by the service worker when someone opens a page that was never saved
 * on this device while they have no connection (for example a shelter detail
 * page they haven't visited). Without it the browser shows its own error page.
 *
 * It is precached, so it has to work with no network and no data of its own:
 * nothing here calls the API. Links are plain <a> tags on purpose -- a full
 * page load goes through the service worker's saved copies, which is what
 * works offline; a client-side <Link> would need data that isn't saved.
 */

function subscribeToConnection(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}
const getOnline = () => navigator.onLine;
// This page exists for the offline case, so that's what it says until the
// browser can confirm otherwise.
const getServerOnline = () => false;

export default function OfflinePage() {
  const online = useSyncExternalStore(
    subscribeToConnection,
    getOnline,
    getServerOnline,
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <PageHeader
        icon={online ? Wifi : WifiOff}
        title={online ? "You're back online" : "You're offline"}
        description={
          online
            ? "The connection is back. Reload to open the page you wanted."
            : "This page hasn't been saved on this device, so it can't open without a connection."
        }
      />

      {online ? (
        <Button onClick={() => window.location.reload()}>
          Reload the page
        </Button>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Pages you have opened before -- like the shelter list, evacuation
            guidance and the risk map -- still show the data that was saved the
            last time you were online.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <a href="/shelters">Shelters</a>
            </Button>
            <Button asChild variant="outline">
              <a href="/evacuation">Evacuation</a>
            </Button>
            <Button asChild variant="outline">
              <a href="/risk-map">Risk map</a>
            </Button>
            <Button onClick={() => window.location.reload()}>Try again</Button>
          </div>

          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
            If you need urgent help and can&apos;t get a connection, contact
            local authorities or nearby volunteers.
          </p>
        </div>
      )}
    </div>
  );
}
