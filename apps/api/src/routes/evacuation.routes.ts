import { Router, Response } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db";
import {
  EvacuationRouteQueryDTO,
  EvacuationRouteResponse,
  RouteStepInstruction,
} from "@rakkhanet/shared-types";
import { authenticate, AuthenticatedRequest } from "../middleware/auth.middleware";

const router = Router();

// Haversine distance calculator in meters
function computeHaversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// GET /api/evacuation-route
router.get("/", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = EvacuationRouteQueryDTO.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters for evacuation route",
        errors: parseResult.error.errors,
      });
    }

    const { fromLat, fromLng, shelterId } = parseResult.data;
    const db = getDB();

    let targetShelter: any = null;

    if (shelterId) {
      if (!ObjectId.isValid(shelterId)) {
        return res.status(400).json({ success: false, message: "Invalid shelter ID format" });
      }
      targetShelter = await db.collection("shelters").findOne({ _id: new ObjectId(shelterId) });
    }

    // If no shelterId provided or not found, auto-select nearest OPEN/available shelter
    if (!targetShelter) {
      const nearbyShelters = await db
        .collection("shelters")
        .aggregate([
          {
            $geoNear: {
              near: { type: "Point", coordinates: [fromLng, fromLat] },
              distanceField: "distanceMeters",
              spherical: true,
              query: { status: { $ne: "CLOSED" } },
            },
          },
          { $limit: 1 },
        ])
        .toArray();

      if (nearbyShelters.length === 0) {
        return res.status(449).json({
          success: false,
          message: "No accessible emergency shelters found nearby",
        });
      }

      targetShelter = nearbyShelters[0];
    }

    const shelterLng = targetShelter.location.coordinates[0];
    const shelterLat = targetShelter.location.coordinates[1];

    // OSRM Routing Request
    const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${shelterLng},${shelterLat}?overview=full&geometries=geojson&steps=true`;

    let responsePayload: EvacuationRouteResponse;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3-second timeout for fallback resiliency

      const fetchRes = await fetch(osrmUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!fetchRes.ok) {
        throw new Error(`OSRM API responded with status ${fetchRes.status}`);
      }

      const osrmData = await fetchRes.json();

      if (osrmData.code === "Ok" && osrmData.routes && osrmData.routes.length > 0) {
        const route = osrmData.routes[0];
        const rawSteps = route.legs?.[0]?.steps || [];

        const formattedSteps: RouteStepInstruction[] = rawSteps.map((step: any) => ({
          distanceMeters: Math.round(step.distance),
          durationSeconds: Math.round(step.duration),
          instruction: step.maneuver?.type 
            ? `${step.maneuver.type} ${step.maneuver.modifier || ""} onto ${step.name || "open road"}`.trim()
            : `Proceed on ${step.name || "route"}`,
          name: step.name || "Roadway",
        }));

        responsePayload = {
          routeType: "road",
          destinationShelter: {
            ...targetShelter,
            _id: targetShelter._id.toString(),
          },
          distanceMeters: Math.round(route.distance),
          durationMinutes: Math.ceil(route.duration / 60),
          geometry: route.geometry, // GeoJSON LineString
          steps: formattedSteps,
        };
      } else {
        throw new Error("OSRM returned no valid route");
      }
    } catch (osrmError: any) {
      console.warn(`[Evacuation Route] OSRM fetch fallback triggered: ${osrmError.message}`);

      // Fallback: Haversine Euclidean Buffer Route
      const haversineDist = computeHaversineMeters(fromLat, fromLng, shelterLat, shelterLng);
      const estDurationMin = Math.ceil(haversineDist / 80); // Approx 80m/min walking/evacuation speed

      responsePayload = {
        routeType: "fallback",
        destinationShelter: {
          ...targetShelter,
          _id: targetShelter._id.toString(),
        },
        distanceMeters: haversineDist,
        durationMinutes: estDurationMin,
        geometry: {
          type: "LineString",
          coordinates: [
            [fromLng, fromLat],
            [shelterLng, shelterLat],
          ],
        },
        steps: [
          {
            distanceMeters: haversineDist,
            durationSeconds: estDurationMin * 60,
            instruction: `Evacuate directly towards ${targetShelter.name} along the safest open corridor`,
            name: "Direct Evacuation Buffer",
          },
        ],
        warnings: [
          "Live road routing server unreachable. Displaying direct safe-line evacuation route.",
        ],
      };
    }

    return res.json({
      success: true,
      data: responsePayload,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
