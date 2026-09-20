"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { assignReliefRequest, updateReliefRequestStatus } from "@/lib/api";
import type { ReliefRequest } from "@rakkhanet/shared-types";

const PRIORITY_STYLE: Record<ReliefRequest["priority"], string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-risk-medium/15 text-risk-medium-foreground",
  high: "bg-risk-high/15 text-risk-high",
  critical: "bg-risk-severe/15 text-risk-severe",
};

const STATUS_STYLE: Record<ReliefRequest["status"], string> = {
  pending: "bg-muted text-muted-foreground",
  assigned: "bg-risk-medium/15 text-risk-medium-foreground",
  in_progress: "bg-primary/10 text-primary",
  resolved: "bg-risk-low/15 text-risk-low",
};

const CATEGORY_LABELS: Record<ReliefRequest["category"], string> = {
  food: "Food",
  medical: "Medical",
  rescue: "Rescue",
  shelter: "Shelter",
  other: "Other",
};

export function RequestCard({
  request,
  currentUserId,
  role,
  onChanged,
}: {
  request: ReliefRequest;
  currentUserId: string;
  role: "citizen" | "volunteer" | "coordinator" | "admin";
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const handleSelfAssign = async () => {
    setBusy(true);
    try {
      await assignReliefRequest(request._id, currentUserId);
      toast.success("Assigned to you");
      onChanged();
    } catch {
      toast.error("Couldn't assign -- try again");
    } finally {
      setBusy(false);
    }
  };

  const handleStatusChange = async (status: ReliefRequest["status"]) => {
    setBusy(true);
    try {
      await updateReliefRequestStatus(request._id, status);
      toast.success("Status updated");
      onChanged();
    } catch {
      toast.error("Couldn't update status -- try again");
    } finally {
      setBusy(false);
    }
  };

  const isAssignedToMe = request.assignedVolunteerId === currentUserId;
  const canSelfAssign = role === "volunteer" && request.status === "pending";
  const canProgressStatus =
    (role === "volunteer" && isAssignedToMe) ||
    role === "coordinator" ||
    role === "admin";

  return (
    <div className="rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">
          {CATEGORY_LABELS[request.category]}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PRIORITY_STYLE[request.priority]}`}
        >
          {request.priority}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[request.status]}`}
        >
          {request.status.replace("_", " ")}
        </span>
        {isAssignedToMe && (
          <span className="text-xs text-muted-foreground">
            (assigned to you)
          </span>
        )}
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {request.description}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {new Date(request.createdAt).toLocaleString()}
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        {canSelfAssign && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleSelfAssign}
            disabled={busy}
          >
            Accept this request
          </Button>
        )}
        {canProgressStatus && request.status === "assigned" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleStatusChange("in_progress")}
            disabled={busy}
          >
            Mark in progress
          </Button>
        )}
        {canProgressStatus && request.status === "in_progress" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleStatusChange("resolved")}
            disabled={busy}
          >
            Mark resolved
          </Button>
        )}
      </div>
    </div>
  );
}
