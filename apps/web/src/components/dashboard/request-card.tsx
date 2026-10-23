"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import {
  assignReliefRequest,
  updateReliefRequestStatus,
  type AssignableVolunteer,
} from "@/lib/api";
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

const PRIORITY_RANK: Record<ReliefRequest["priority"], number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

/**
 * How the AI's suggestion compares with the priority the request was filed
 * with. The interesting case for triage is "higher" -- a citizen who
 * under-reported -- so the card says so in words, not just with a colour.
 * Returns null when there is nothing worth showing: no suggestion (AI down,
 * not confident, or not answered yet) or a request that is already resolved.
 */
function priorityHint(request: ReliefRequest) {
  const suggestion = request.suggestedPriority;
  if (!suggestion || request.status === "resolved") return null;

  const diff =
    PRIORITY_RANK[suggestion.priority] - PRIORITY_RANK[request.priority];
  const relation = diff > 0 ? "higher" : diff < 0 ? "lower" : "same";
  return { suggestion, relation } as const;
}

const HINT_LABEL = {
  higher: "AI suggests higher priority:",
  lower: "AI suggests lower priority:",
  same: "AI agrees:",
} as const;

const selectClass =
  "h-8 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

export function RequestCard({
  request,
  currentUserId,
  role,
  onChanged,
  volunteers = [],
}: {
  request: ReliefRequest;
  currentUserId: string;
  role: "citizen" | "volunteer" | "coordinator" | "admin";
  onChanged: () => void;
  /** Only loaded for coordinators/admins; empty for everyone else. */
  volunteers?: AssignableVolunteer[];
}) {
  const [busy, setBusy] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState("");

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

  const handleAssignToVolunteer = async () => {
    if (!selectedVolunteer) return;
    setBusy(true);
    try {
      await assignReliefRequest(request._id, selectedVolunteer);
      const name =
        volunteers.find((v) => v.id === selectedVolunteer)?.name ??
        "the volunteer";
      toast.success(`Assigned to ${name}`);
      setSelectedVolunteer("");
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

  // Coordinators/admins can pick a specific volunteer (and reassign) until
  // the request is resolved.
  const isCoordinatorOrAdmin = role === "coordinator" || role === "admin";
  const canAssignOthers = isCoordinatorOrAdmin && request.status !== "resolved";

  // Only coordinators/admins have the volunteer list, so only they see names.
  const assignedName =
    isCoordinatorOrAdmin && request.assignedVolunteerId
      ? (volunteers.find((v) => v.id === request.assignedVolunteerId)?.name ??
        "an unknown volunteer")
      : null;

  // The API only sends suggestedPriority to operational roles, but the card
  // also checks the role, so a citizen can never see it even by mistake.
  const hint = role === "citizen" ? null : priorityHint(request);

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
        {assignedName && !isAssignedToMe && (
          <span className="text-xs text-muted-foreground">
            Assigned to {assignedName}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {request.description}
      </p>
      {hint && (
        <p
          className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
          title="An automated suggestion (English text only). It never changes the priority the request was filed with."
        >
          <span
            className={
              hint.relation === "higher" ? "font-medium text-foreground" : ""
            }
          >
            {HINT_LABEL[hint.relation]}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 font-medium capitalize ${PRIORITY_STYLE[hint.suggestion.priority]}`}
          >
            {hint.suggestion.priority}
          </span>
          <span>({Math.round(hint.suggestion.confidence * 100)}%)</span>
        </p>
      )}
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
        {canAssignOthers && (
          <>
            <select
              aria-label="Assign volunteer"
              className={selectClass}
              value={selectedVolunteer}
              onChange={(e) => setSelectedVolunteer(e.target.value)}
              disabled={busy || volunteers.length === 0}
            >
              <option value="">
                {volunteers.length === 0
                  ? "No volunteers available"
                  : "Assign to…"}
              </option>
              {volunteers.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {v.id === request.assignedVolunteerId ? " (current)" : ""}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              onClick={handleAssignToVolunteer}
              disabled={
                busy ||
                !selectedVolunteer ||
                selectedVolunteer === request.assignedVolunteerId
              }
            >
              {request.assignedVolunteerId ? "Reassign" : "Assign"}
            </Button>
          </>
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
