"use client";

import { useGeolocation } from "@/hooks/use-geolocation";

const MUTED = "text-xs text-muted-foreground";
const WARN =
  "rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm";

function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1.5 font-medium underline underline-offset-2"
    >
      Try again
    </button>
  );
}

/**
 * Tells the person, in plain words, where the location behind what they are
 * looking at (or about to send) came from -- so nobody acts on a default or
 * out-of-date position without knowing it.
 *
 *  - variant "browse": for pages that show things near you (shelters,
 *    evacuation). Silent when the location is fresh or chosen by the user.
 *  - variant "report": for a form that files a location (a help request).
 *    Always says what will be attached.
 */
export function LocationNotice({ variant }: { variant: "browse" | "report" }) {
  const { source, gpsStatus, fixedAt, ready, retryGps } = useGeolocation();

  const pending = !ready || gpsStatus === "pending";
  const savedOn = fixedAt
    ? ` (saved ${new Date(fixedAt).toLocaleString()})`
    : "";
  const blockedNote =
    gpsStatus === "denied"
      ? " Location access is blocked for this site -- allow it in your browser (the lock icon next to the address), then try again."
      : "";

  if (variant === "report") {
    if (source === "gps") {
      return (
        <p className={MUTED}>
          Your current location will be attached automatically so volunteers can
          find you.
        </p>
      );
    }
    if (source === "manual") {
      return (
        <p className={MUTED}>
          The location you chose will be attached so volunteers can find you.
        </p>
      );
    }
    if (source === "saved") {
      if (pending) {
        return (
          <p className={MUTED} role="status">
            Checking your current location...
          </p>
        );
      }
      return (
        <div className={WARN} role="alert">
          <p>
            We can&apos;t get your current location, so this request will use
            your last known one{savedOn}. If you have moved, say where you are
            in your description.{blockedNote}
          </p>
          <RetryButton onClick={retryGps} />
        </div>
      );
    }
    // source === "fallback": nothing is known -- must not file anything.
    if (pending) {
      return (
        <p className={MUTED} role="status">
          Finding your location...
        </p>
      );
    }
    return (
      <div className={WARN} role="alert">
        <p>
          We can&apos;t find your location, so a request can&apos;t be sent yet
          -- it would be placed in the wrong area.{blockedNote}
        </p>
        <RetryButton onClick={retryGps} />
      </div>
    );
  }

  // variant === "browse"
  if (source === "gps" || source === "manual") return null;

  if (source === "saved") {
    if (pending) return null; // GPS usually answers within seconds
    return (
      <div className="mb-4 text-sm text-muted-foreground" role="status">
        <p>
          Showing results near your last known location{savedOn}, because your
          current location isn&apos;t available.{blockedNote}
        </p>
        <RetryButton onClick={retryGps} />
      </div>
    );
  }

  // source === "fallback"
  if (pending) {
    return (
      <p className="mb-4 text-xs text-muted-foreground" role="status">
        Finding your location...
      </p>
    );
  }
  return (
    <div className="mb-4 text-sm text-muted-foreground" role="status">
      <p>
        We can&apos;t find your location, so these results are for Chattogram, a
        default area -- not necessarily near you.{blockedNote}
      </p>
      <RetryButton onClick={retryGps} />
    </div>
  );
}
