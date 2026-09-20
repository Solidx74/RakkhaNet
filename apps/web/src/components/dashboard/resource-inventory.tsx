"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateResourceQuantity } from "@/lib/api";
import type { Resource, Shelter } from "@rakkhanet/shared-types";

function ResourceRow({
  resource,
  onUpdated,
}: {
  resource: Resource;
  onUpdated: (r: Resource) => void;
}) {
  const [quantity, setQuantity] = useState(resource.quantity);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateResourceQuantity(resource._id, quantity);
      onUpdated(updated);
      toast.success("Updated");
    } catch {
      toast.error("Couldn't update -- try again");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 py-1.5 text-sm">
      <span className="capitalize text-muted-foreground">{resource.type}</span>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="h-8 w-24"
        />
        <span className="text-xs text-muted-foreground">{resource.unit}</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSave}
          disabled={saving || quantity === resource.quantity}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

export function ResourceInventory({
  shelters,
  resources,
  onResourceUpdated,
}: {
  shelters: Shelter[];
  resources: Resource[];
  onResourceUpdated: (updated: Resource) => void;
}) {
  const shelterById = new Map(shelters.map((s) => [s._id, s]));
  const byShelter = new Map<string, Resource[]>();
  for (const r of resources) {
    const list = byShelter.get(r.shelterId) ?? [];
    list.push(r);
    byShelter.set(r.shelterId, list);
  }

  return (
    <div className="space-y-3">
      {Array.from(byShelter.entries()).map(([shelterId, items]) => (
        <div key={shelterId} className="rounded-lg border p-3">
          <p className="text-sm font-medium">
            {shelterById.get(shelterId)?.name ?? "Unknown shelter"}
          </p>
          <div className="mt-1 divide-y">
            {items.map((r) => (
              <ResourceRow
                key={r._id}
                resource={r}
                onUpdated={onResourceUpdated}
              />
            ))}
          </div>
        </div>
      ))}
      {byShelter.size === 0 && (
        <p className="text-sm text-muted-foreground">
          No resource records yet.
        </p>
      )}
    </div>
  );
}
