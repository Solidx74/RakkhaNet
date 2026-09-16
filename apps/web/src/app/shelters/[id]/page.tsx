"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Phone, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { UpdateShelterForm } from "@/components/shelters/update-shelter-form";
import { authClient } from "@/lib/auth-client";
import type { Shelter } from "@rakkhanet/shared-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function ShelterDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [shelter, setShelter] = useState<Shelter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = authClient.useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const canUpdate =
    role === "volunteer" || role === "coordinator" || role === "admin";

  useEffect(() => {
    fetch(`${API_URL}/api/shelters/${params.id}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Shelter not found");
        return res.json();
      })
      .then((data) => setShelter(data.shelter))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (error || !shelter) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <p className="text-muted-foreground">{error ?? "Shelter not found."}</p>
        <Button
          variant="ghost"
          className="mt-4"
          onClick={() => router.push("/shelters")}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Shelter Locator
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/shelters")}
        className="mb-4"
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Back to Shelter Locator
      </Button>

      <PageHeader
        icon={MapPin}
        title={shelter.name}
        description={shelter.address}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            Occupancy
          </div>
          <p className="mt-1 text-2xl font-semibold">
            {shelter.currentOccupancy} / {shelter.capacity}
          </p>
          <span
            className={
              "mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium " +
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

        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4" />
            Contact
          </div>
          <p className="mt-1 font-medium">{shelter.contactPerson}</p>
          {shelter.contactPhone && (
            <p className="text-sm text-muted-foreground">
              {shelter.contactPhone}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-lg border p-4">
        <h3 className="text-sm font-medium">Available resources</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {shelter.resources.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No resource information available.
            </p>
          )}
          {shelter.resources.map((r) => (
            <span
              key={r.type}
              className={
                "rounded-full px-2.5 py-1 text-xs font-medium capitalize " +
                (r.available
                  ? "bg-risk-low/15 text-risk-low"
                  : "bg-muted text-muted-foreground line-through")
              }
            >
              {r.type}
            </span>
          ))}
        </div>
      </div>

      {canUpdate && (
        <div className="mt-4">
          <UpdateShelterForm shelter={shelter} onUpdated={setShelter} />
        </div>
      )}
    </div>
  );
}
