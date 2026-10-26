"use client";

import { useCallback, useState } from "react";
import { ClipboardList, Plus } from "lucide-react";
import { toast } from "react-toastify";
import { PageHeader } from "@/components/layout/page-header";
import { RequireRole } from "@/components/auth/require-role";
import { LocationNotice } from "@/components/location/location-notice";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOfflineData } from "@/hooks/use-offline-data";
import { useReliefRequestsLive } from "@/hooks/use-relief-requests-live";
import { useGeolocation } from "@/hooks/use-geolocation";
import { fetchMyRequests, submitReliefRequest } from "@/lib/api";
import type { ReliefRequest } from "@rakkhanet/shared-types";

const CATEGORY_LABELS: Record<ReliefRequest["category"], string> = {
  food: "Food",
  medical: "Medical",
  rescue: "Rescue",
  shelter: "Shelter",
  other: "Other",
};

const STATUS_STYLE: Record<ReliefRequest["status"], string> = {
  pending: "bg-muted text-muted-foreground",
  assigned: "bg-risk-medium/15 text-risk-medium-foreground",
  in_progress: "bg-primary/10 text-primary",
  resolved: "bg-risk-low/15 text-risk-low",
};

function MyRequestsContent() {
  const { position, source, ready } = useGeolocation();
  // A request is pinned to this position, and volunteers go there. With no
  // known location the position is only a default (Chattogram), so nothing
  // may be filed against it. A "saved" (last known) location is allowed --
  // the notice in the form warns about it.
  const canAttachLocation = ready && source !== "fallback";
  const {
    data: requests,
    loading,
    refresh,
  } = useOfflineData("my-requests", fetchMyRequests);
  useReliefRequestsLive(refresh); // live update when a coordinator assigns/updates this request

  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ReliefRequest["category"]>("food");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!canAttachLocation) {
      toast.error("We can't find your location yet -- see the note above");
      return;
    }
    if (!description.trim()) {
      toast.error("Please describe what help you need");
      return;
    }
    setSubmitting(true);
    try {
      await submitReliefRequest({
        location: { type: "Point", coordinates: [position[1], position[0]] }, // [lng, lat]
        description: description.trim(),
        category,
      });
      toast.success("Request submitted");
      setDescription("");
      setCategory("food");
      setOpen(false);
      refresh();
    } catch {
      toast.error("Couldn't submit your request -- try again");
    } finally {
      setSubmitting(false);
    }
  }, [canAttachLocation, description, category, position, refresh]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          icon={ClipboardList}
          title="My Requests"
          description="Requests for help you've submitted and their current status."
        />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="shrink-0">
              <Plus className="mr-1.5 h-4 w-4" />
              New request
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request help</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>What do you need?</Label>
                <Select
                  value={category}
                  onValueChange={(v) =>
                    setCategory(v as ReliefRequest["category"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Describe your situation</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Family of 4, home flooded, need transport to nearest shelter"
                  rows={4}
                />
              </div>
              <LocationNotice variant="report" />
            </div>
            <DialogFooter>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !canAttachLocation}
                className="w-full"
              >
                {submitting ? "Submitting..." : "Submit request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 space-y-2">
        {loading && !requests && (
          <p className="text-sm text-muted-foreground">Loading...</p>
        )}
        {requests?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            You haven&apos;t submitted any requests yet.
          </p>
        )}
        {requests?.map((r) => (
          <div key={r._id} className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {CATEGORY_LABELS[r.category]}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[r.status]}`}
              >
                {r.status.replace("_", " ")}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {r.description}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Submitted {new Date(r.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Any signed-in account may use this page; signed-out visitors are sent
 * home. All four roles are listed because RequireRole has no "any role"
 * option -- same list as the My Requests item in nav-config.ts.
 *
 * Wrapping (rather than checking inside the page) matters: the content
 * above is not even mounted for a signed-out visitor, so it never calls the
 * API or opens the live-update socket on their behalf.
 *
 * Like every RequireRole, this is a UX gate, not the security boundary: the
 * API already answers 401 to anyone not signed in (requireAuth on
 * /api/relief-requests), so no data was ever exposed -- only the empty page.
 */
export default function MyRequestsPage() {
  return (
    <RequireRole roles={["citizen", "volunteer", "coordinator", "admin"]}>
      <MyRequestsContent />
    </RequireRole>
  );
}
