"use client";

import { useState, type FormEvent } from "react";
import { toast } from "react-toastify";
import type { RiskZoneComputeInput } from "@rakkhanet/shared-types";
import { createRiskZone, type CreatedRiskZone } from "@/lib/api";

/**
 * Builds a square polygon around a center point, as a closed ring in
 * GeoJSON order: [longitude, latitude], counter-clockwise from south-west.
 * One degree of latitude is ~111 km; a degree of longitude shrinks with
 * cos(latitude), so the longitude offset is corrected for that.
 */
function squarePolygon(
  lat: number,
  lng: number,
  sizeKm: number,
): RiskZoneComputeInput["geometry"] {
  const half = sizeKm / 2;
  const dLat = half / 111;
  const dLng = half / (111 * Math.cos((lat * Math.PI) / 180));
  const ring: [number, number][] = [
    [lng - dLng, lat - dLat],
    [lng + dLng, lat - dLat],
    [lng + dLng, lat + dLat],
    [lng - dLng, lat + dLat],
    [lng - dLng, lat - dLat], // closed: last point equals first
  ];
  return { type: "Polygon", coordinates: [ring] };
}

/** Empty string -> undefined (field left out); anything else must be a number. */
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

export function CreateRiskZoneForm() {
  const [region, setRegion] = useState("");
  const [hazardType, setHazardType] = useState<"flood" | "cyclone">("flood");
  const [rainfall, setRainfall] = useState("");
  const [riverLevel, setRiverLevel] = useState("");
  const [elevation, setElevation] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [sizeKm, setSizeKm] = useState("10");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreatedRiskZone | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    let payload: RiskZoneComputeInput;
    try {
      if (region.trim().length < 2) {
        throw new Error("Region must be at least 2 characters");
      }

      const rainfallMm = optionalNumber(rainfall, "Rainfall");
      const riverLevelM = optionalNumber(riverLevel, "River level");
      const elevationM = optionalNumber(elevation, "Elevation");
      if (rainfallMm !== undefined && rainfallMm < 0) {
        throw new Error("Rainfall can't be negative");
      }
      if (
        rainfallMm === undefined &&
        riverLevelM === undefined &&
        elevationM === undefined
      ) {
        throw new Error(
          "Enter at least one of rainfall, river level, elevation",
        );
      }

      const centerLat = requiredNumber(lat, "Latitude");
      const centerLng = requiredNumber(lng, "Longitude");
      const size = requiredNumber(sizeKm, "Size");
      if (centerLat < -85 || centerLat > 85) {
        throw new Error("Latitude must be between -85 and 85");
      }
      if (centerLng < -180 || centerLng > 180) {
        throw new Error("Longitude must be between -180 and 180");
      }
      if (size <= 0) throw new Error("Size must be greater than 0");

      payload = {
        region: region.trim(),
        hazardType,
        geometry: squarePolygon(centerLat, centerLng, size),
        inputs: { rainfallMm, riverLevelM, elevationM },
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid input");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createRiskZone(payload);
      setResult(created);
      toast.success(`Risk zone "${created.region}" created`);
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
      <h2 className="font-medium">Create risk zone</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        The level is computed on the server. The AI model is used when all three
        inputs are given and in range (rainfall 0–350 mm, river level 0–12 m,
        elevation 0–25 m); otherwise the rule-based fallback is used.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Region name">
            <input
              className={inputClass}
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g. Sylhet Sadar"
            />
          </Field>
          <Field label="Hazard type">
            <select
              className={inputClass}
              value={hazardType}
              onChange={(e) =>
                setHazardType(e.target.value as "flood" | "cyclone")
              }
            >
              <option value="flood">Flood</option>
              <option value="cyclone">Cyclone</option>
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Rainfall (mm)">
            <input
              className={inputClass}
              inputMode="decimal"
              value={rainfall}
              onChange={(e) => setRainfall(e.target.value)}
            />
          </Field>
          <Field label="River level (m)">
            <input
              className={inputClass}
              inputMode="decimal"
              value={riverLevel}
              onChange={(e) => setRiverLevel(e.target.value)}
            />
          </Field>
          <Field label="Elevation (m)">
            <input
              className={inputClass}
              inputMode="decimal"
              value={elevation}
              onChange={(e) => setElevation(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Center latitude">
            <input
              className={inputClass}
              inputMode="decimal"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="e.g. 24.89"
            />
          </Field>
          <Field label="Center longitude">
            <input
              className={inputClass}
              inputMode="decimal"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="e.g. 91.87"
            />
          </Field>
          <Field label="Zone size (km)" hint="Side length of the square">
            <input
              className={inputClass}
              inputMode="decimal"
              value={sizeKm}
              onChange={(e) => setSizeKm(e.target.value)}
            />
          </Field>
        </div>

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
          {submitting ? "Creating…" : "Create risk zone"}
        </button>
      </form>

      {result && <ResultPanel result={result} />}
    </section>
  );
}

function ResultPanel({ result }: { result: CreatedRiskZone }) {
  const isAi = result.scoredBy === "ai";
  const probabilities = result.probabilities
    ? Object.entries(result.probabilities).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="mt-6 rounded-md border bg-muted/40 p-4 text-sm">
      <p className="font-medium">Created: {result.region}</p>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="text-muted-foreground">Risk level</dt>
        <dd className="font-medium capitalize">{result.riskLevel}</dd>

        <dt className="text-muted-foreground">Rule score</dt>
        <dd>{result.riskScore} / 100</dd>

        <dt className="text-muted-foreground">Scored by</dt>
        <dd>{isAi ? "AI model" : "Rule-based fallback"}</dd>

        {isAi && typeof result.confidence === "number" && (
          <>
            <dt className="text-muted-foreground">Confidence</dt>
            <dd>{(result.confidence * 100).toFixed(1)}%</dd>
          </>
        )}
      </dl>

      {isAi && probabilities.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Class probabilities:{" "}
          {probabilities
            .map(([level, p]) => `${level} ${(p * 100).toFixed(1)}%`)
            .join(" · ")}
        </p>
      )}

      {isAi ? (
        <p className="mt-3 text-xs text-muted-foreground">
          The score is always the rule-based 0–100 index, so it can differ
          slightly from the AI's level.
        </p>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          The AI service was unavailable, an input was missing, or an input was
          outside the model's range, so the rule-based score was used.
        </p>
      )}
    </div>
  );
}
