"use client";

import { useState, type FormEvent } from "react";
import { toast } from "react-toastify";
import type { ShelterCreateInput } from "@rakkhanet/shared-types";
import { createShelter, type CreatedShelter } from "@/lib/api";

const RESOURCE_TYPES = [
  { value: "food", label: "Food" },
  { value: "water", label: "Water" },
  { value: "medicine", label: "Medicine" },
  { value: "blankets", label: "Blankets" },
  { value: "other", label: "Other" },
] as const;

type ResourceType = (typeof RESOURCE_TYPES)[number]["value"];

/** Empty string -> undefined; anything else must be a number. */
function optionalNumber(value: string, label: string): number | undefined {
  if (value.trim() === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`${label} must be a number`);
  return n;
}

function requiredNumber(value: string, label: string): number {
  const n = optionalNumber(value, label);
  if (n === undefined) throw new Error(`${label} is required`);
  return n;
}

const inputClass =
  "h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && (
        <span className="block text-xs text-muted-foreground">{hint}</span>
      )}
    </label>
  );
}

export function CreateShelterForm() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [capacity, setCapacity] = useState("");
  const [occupancy, setOccupancy] = useState("0");
  const [status, setStatus] = useState<"open" | "full" | "closed">("open");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [resources, setResources] = useState<Set<ResourceType>>(new Set());

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreatedShelter | null>(null);

  function toggleResource(type: ResourceType) {
    setResources((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function resetForm() {
    setName("");
    setAddress("");
    setLat("");
    setLng("");
    setCapacity("");
    setOccupancy("0");
    setStatus("open");
    setContactPerson("");
    setContactPhone("");
    setResources(new Set());
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    let payload: ShelterCreateInput;
    try {
      if (name.trim().length < 2) {
        throw new Error("Name must be at least 2 characters");
      }
      if (address.trim().length < 2) {
        throw new Error("Address must be at least 2 characters");
      }
      if (contactPerson.trim().length < 2) {
        throw new Error("Contact person must be at least 2 characters");
      }

      const centerLat = requiredNumber(lat, "Latitude");
      const centerLng = requiredNumber(lng, "Longitude");
      if (centerLat < -90 || centerLat > 90) {
        throw new Error("Latitude must be between -90 and 90");
      }
      if (centerLng < -180 || centerLng > 180) {
        throw new Error("Longitude must be between -180 and 180");
      }

      const cap = requiredNumber(capacity, "Capacity");
      const occ = requiredNumber(occupancy, "Current occupancy");
      if (!Number.isInteger(cap) || cap <= 0) {
        throw new Error("Capacity must be a whole number greater than 0");
      }
      if (!Number.isInteger(occ) || occ < 0) {
        throw new Error("Current occupancy must be a whole number, 0 or more");
      }
      if (occ > cap) {
        throw new Error("Current occupancy can't exceed capacity");
      }

      const phone = contactPhone.trim();

      payload = {
        name: name.trim(),
        address: address.trim(),
        // GeoJSON order: [longitude, latitude].
        location: { type: "Point", coordinates: [centerLng, centerLat] },
        capacity: cap,
        currentOccupancy: occ,
        status,
        resources: RESOURCE_TYPES.filter((r) => resources.has(r.value)).map(
          (r) => ({ type: r.value, available: true }),
        ),
        contactPerson: contactPerson.trim(),
        // Left out entirely when blank, rather than sent as "".
        ...(phone && { contactPhone: phone }),
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid input");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createShelter(payload);
      setResult(created);
      toast.success(`Shelter "${created.name}" created`);
      resetForm();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-lg border p-4">
      <h2 className="font-medium">Create shelter</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Register a shelter so it appears on the Shelters page and in nearby
        search. Ticked resources are saved as currently available; volunteers
        can update occupancy and status later.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Shelter name">
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sylhet Government High School"
            />
          </Field>
          <Field label="Address">
            <input
              className={inputClass}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, area, upazila"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Latitude">
            <input
              className={inputClass}
              inputMode="decimal"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="e.g. 24.89"
            />
          </Field>
          <Field label="Longitude">
            <input
              className={inputClass}
              inputMode="decimal"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="e.g. 91.87"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Capacity">
            <input
              className={inputClass}
              inputMode="numeric"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="people"
            />
          </Field>
          <Field label="Current occupancy">
            <input
              className={inputClass}
              inputMode="numeric"
              value={occupancy}
              onChange={(e) => setOccupancy(e.target.value)}
            />
          </Field>
          <Field label="Status">
            <select
              className={inputClass}
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "open" | "full" | "closed")
              }
            >
              <option value="open">Open</option>
              <option value="full">Full</option>
              <option value="closed">Closed</option>
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact person">
            <input
              className={inputClass}
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
            />
          </Field>
          <Field label="Contact phone" hint="Optional">
            <input
              className={inputClass}
              inputMode="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </Field>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Resources available</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {RESOURCE_TYPES.map((r) => (
              <label key={r.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={resources.has(r.value)}
                  onChange={() => toggleResource(r.value)}
                />
                {r.label}
              </label>
            ))}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create shelter"}
        </button>
      </form>

      {result && (
        <div className="mt-6 rounded-md border bg-muted/40 p-4 text-sm">
          <p className="font-medium">Created: {result.name}</p>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="text-muted-foreground">Address</dt>
            <dd>{result.address}</dd>
            <dt className="text-muted-foreground">Occupancy</dt>
            <dd>
              {result.currentOccupancy} / {result.capacity}
            </dd>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="capitalize">{result.status}</dd>
          </dl>
        </div>
      )}
    </section>
  );
}
