import { Router } from "express";
import { getDb } from "../db/connection.js";
import { asyncHandler, ApiError } from "../middleware/errorHandler.js";
import { haversineDistanceKm, compassBearing } from "../lib/geoMath.js";

const OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/driving";
const OSRM_TIMEOUT_MS = 5000;
const AVERAGE_WALKING_KMH = 4.5;

interface OsrmRouteResponse {
  code: string;
  routes: Array<{
    distance: number;
    duration: number;
    geometry: { type: "LineString"; coordinates: [number, number][] };
    legs: Array<{ steps: Array<{ name: string }> }>;
  }>;
}

/**
 * Real road routing via the free public OSRM demo server. Returns null on
 * ANY failure (network error, timeout, rate limit, malformed response) --
 * the demo server makes no uptime promises, so the caller always needs a
 * fallback path, not just a try/catch that surfaces a 502 to the user.
 */
async function tryOsrmRoute(
  lat: number,
  lng: number,
  destLat: number,
  destLng: number,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS);
  try {
    const url = `${OSRM_BASE_URL}/${lng},${lat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;

    const data = (await res.json()) as OsrmRouteResponse;
    if (data.code !== "Ok" || !data.routes?.[0]) return null;

    const route = data.routes[0];
    const roadNames = Array.from(
      new Set(
        route.legs
          .flatMap((leg) => leg.steps)
          .map((step) => step.name)
          .filter((name) => name.length > 0),
      ),
    );

    return {
      routeType: "driving" as const,
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      geometry: route.geometry,
      roadNames,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function createEvacuationRouter() {
  const router = Router();

  // Public, same reasoning as shelters/risk-zones -- evacuation guidance
  // cannot require an account.
  router.get(
    "/route",
    asyncHandler(async (req, res) => {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);

      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        throw new ApiError(400, "lat and lng query params are required");
      }

      // Filtering to status: "open" is what makes this "evacuation
      // guidance" rather than just "nearest shelter" -- a full shelter is
      // not a safe destination even if it's the closest one.
      const shelter = await getDb()
        .collection("shelters")
        .findOne({
          status: "open",
          location: {
            $near: { $geometry: { type: "Point", coordinates: [lng, lat] } },
          },
        });

      if (!shelter) {
        throw new ApiError(404, "No open shelter found nearby");
      }

      const [destLng, destLat] = shelter.location.coordinates as [
        number,
        number,
      ];

      // Try real road routing first; fall back to a straight-line estimate
      // if the external routing service doesn't respond -- same
      // "degrade, don't break" philosophy as the offline-caching work.
      const osrmResult = await tryOsrmRoute(lat, lng, destLat, destLng);
      if (osrmResult) {
        res.json({ shelter, ...osrmResult });
        return;
      }

      const distanceKm = haversineDistanceKm(lat, lng, destLat, destLng);
      const direction = compassBearing(lat, lng, destLat, destLng);
      const estimatedWalkMinutes = Math.round(
        (distanceKm / AVERAGE_WALKING_KMH) * 60,
      );

      res.json({
        shelter,
        routeType: "straight-line" as const,
        distanceKm: Math.round(distanceKm * 10) / 10,
        direction,
        estimatedWalkMinutes,
        instructions: `Head ${direction} for approximately ${distanceKm.toFixed(1)} km (straight-line distance) to reach ${shelter.name}. Live road routing was unavailable, so this is an estimate.`,
      });
    }),
  );

  return router;
}
