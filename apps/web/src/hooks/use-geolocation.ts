"use client";

import { useSyncExternalStore } from "react";

// Chattogram city centre -- the LAST resort, used only when nothing better
// is known (no GPS answer, nothing saved, nothing chosen), so a map still
// shows something relevant instead of the whole globe. Anything that files
// data against a location must check `source` and not trust this one.
const FALLBACK_LOCATION: LatLng = [22.3569, 91.7832];

const STORAGE_KEY = "rakkhanet:location:v1";
const GPS_TIMEOUT_MS = 8000;
const GPS_MAX_AGE_MS = 5 * 60 * 1000;

type LatLng = [number, number];

/**
 * Where `position` came from:
 *  - "gps":      a fresh GPS fix from this visit
 *  - "saved":    the last GPS fix from an earlier visit (GPS hasn't answered
 *                yet this visit, or was denied/unavailable) -- may be old
 *  - "manual":   chosen by the user; never overridden by GPS
 *  - "fallback": nothing known -- the Chattogram default
 */
export type LocationSource = "gps" | "saved" | "manual" | "fallback";
export type GpsStatus = "pending" | "ok" | "denied" | "unavailable";

interface LocationState {
  position: LatLng;
  source: LocationSource;
  gpsStatus: GpsStatus;
  /** When the GPS fix behind a "gps"/"saved" position was taken (ms), else null. */
  fixedAt: number | null;
  /** False on the server and until the browser-side store has loaded. */
  ready: boolean;
}

interface Stored {
  gps: LatLng | null;
  gpsAt: number | null;
  manual: LatLng | null;
}

// What the server (and the very first client render) sees. One constant
// object, so useSyncExternalStore gets a stable snapshot.
const SERVER_STATE: LocationState = {
  position: FALLBACK_LOCATION,
  source: "fallback",
  gpsStatus: "pending",
  fixedAt: null,
  ready: false,
};

// ---- module-level store: shared by every component that calls the hook ----

let state: LocationState = SERVER_STATE;
let stored: Stored = { gps: null, gpsAt: null, manual: null };
let gpsStatus: GpsStatus = "pending";
let gpsFresh = false;
let initialised = false;
let gpsRequested = false;
const listeners = new Set<() => void>();

function isValidLatLng(value: unknown): value is LatLng {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1]) &&
    value[0] >= -90 &&
    value[0] <= 90 &&
    value[1] >= -180 &&
    value[1] <= 180
  );
}

function readStored(): Stored {
  const empty: Stored = { gps: null, gpsAt: null, manual: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return empty;
    const p = parsed as Record<string, unknown>;
    return {
      gps: isValidLatLng(p.gps) ? p.gps : null,
      gpsAt: typeof p.gpsAt === "number" ? p.gpsAt : null,
      manual: isValidLatLng(p.manual) ? p.manual : null,
    };
  } catch {
    // Unreadable or corrupt -- behave as if nothing was saved.
    return empty;
  }
}

function writeStored() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Storage full or blocked (private mode): the location still works for
    // this visit, it just won't be remembered.
  }
}

function buildState(): LocationState {
  const position = stored.manual ?? stored.gps ?? FALLBACK_LOCATION;
  const source: LocationSource = stored.manual
    ? "manual"
    : stored.gps
      ? gpsFresh
        ? "gps"
        : "saved"
      : "fallback";

  return {
    // Same array when the coordinates haven't changed, so consumers that
    // depend on `position` don't see a "new" value on unrelated updates.
    position:
      state.position[0] === position[0] && state.position[1] === position[1]
        ? state.position
        : position,
    source,
    gpsStatus,
    fixedAt: source === "gps" || source === "saved" ? stored.gpsAt : null,
    ready: true,
  };
}

function commit() {
  state = buildState();
  listeners.forEach((listener) => listener());
}

function requestGps() {
  if (gpsRequested) return;
  gpsRequested = true;

  if (typeof navigator === "undefined" || !navigator.geolocation) {
    gpsStatus = "unavailable";
    commit();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      gpsStatus = "ok";
      gpsFresh = true;
      stored = {
        ...stored,
        gps: [pos.coords.latitude, pos.coords.longitude],
        gpsAt: Date.now(),
      };
      writeStored();
      commit();
    },
    (err) => {
      // PERMISSION_DENIED is code 1. Whatever we already had (saved,
      // manual or fallback) stays; the status lets the UI explain why.
      gpsStatus = err.code === 1 ? "denied" : "unavailable";
      gpsRequested = false; // allow another attempt, e.g. after clearManual()
      commit();
    },
    { timeout: GPS_TIMEOUT_MS, maximumAge: GPS_MAX_AGE_MS },
  );
}

function onStorageEvent(event: StorageEvent) {
  // Another tab changed the saved location (e.g. picked one manually).
  if (event.key !== STORAGE_KEY) return;
  stored = readStored();
  commit();
}

function initialise() {
  if (initialised || typeof window === "undefined") return;
  initialised = true;

  stored = readStored();
  window.addEventListener("storage", onStorageEvent);

  // Publish what we know first, so the app can start from the last known
  // location immediately instead of waiting for GPS.
  commit();

  // A manual choice means "stop guessing": don't ask for GPS at all.
  if (!stored.manual) requestGps();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  initialise();
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => state;
const getServerSnapshot = () => SERVER_STATE;

/**
 * Choose a location by hand (e.g. GPS is denied, or you're planning for
 * another area). Persisted, shared with every page, and never overridden by
 * GPS until clearManual(). Returns false and changes nothing if the
 * coordinates aren't a valid latitude/longitude.
 */
export function setManualLocation(lat: number, lng: number): boolean {
  const next: LatLng = [lat, lng];
  if (!isValidLatLng(next) || typeof window === "undefined") return false;
  initialise();
  stored = { ...stored, manual: next };
  writeStored();
  commit();
  return true;
}

/** Go back to GPS (or the last saved GPS fix) after a manual choice. */
export function clearManualLocation() {
  if (typeof window === "undefined") return;
  initialise();
  stored = { ...stored, manual: null };
  writeStored();
  commit();
  requestGps();
}

/**
 * The user's location, shared by every page. `position` is [lat, lng].
 * `isFallback` is kept for older callers: true only when nothing is known.
 * Code that files data against a location should look at `source` (and
 * `ready`) rather than trust `position` blindly.
 */
export function useGeolocation() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    position: s.position,
    isFallback: s.source === "fallback",
    source: s.source,
    gpsStatus: s.gpsStatus,
    fixedAt: s.fixedAt,
    ready: s.ready,
    setManual: setManualLocation,
    clearManual: clearManualLocation,
  };
}
