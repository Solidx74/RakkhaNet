"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Shelter } from "@rakkhanet/shared-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export function UpdateShelterForm({
  shelter,
  onUpdated,
}: {
  shelter: Shelter;
  onUpdated: (updated: Shelter) => void;
}) {
  const [occupancy, setOccupancy] = useState(shelter.currentOccupancy);
  const [status, setStatus] = useState<Shelter["status"]>(shelter.status);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/shelters/${shelter._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentOccupancy: occupancy, status }),
      });
      if (!res.ok) throw new Error("Update failed");
      const data = await res.json();
      onUpdated(data.shelter);
      toast.success("Shelter updated");
    } catch {
      toast.error("Couldn't update shelter -- try again");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
      <h3 className="text-sm font-medium">Update shelter status</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Visible to volunteers and coordinators only -- report what you see on
        the ground.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="occupancy">Current occupancy</Label>
          <Input
            id="occupancy"
            type="number"
            min={0}
            max={shelter.capacity}
            value={occupancy}
            onChange={(e) => setOccupancy(Number(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as Shelter["status"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="full">Full</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button size="sm" className="mt-3" onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save update"}
      </Button>
    </div>
  );
}
