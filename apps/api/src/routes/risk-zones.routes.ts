import { Router, Response } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db";
import { fetchWeatherData } from "../services/weather.service";
import {
  CreateRiskZoneDTO,
  UpdateRiskZoneDTO,
  calculateRiskScore,
} from "@rakkhanet/shared-types";
import { authenticate, requireRole, AuthenticatedRequest } from "../middleware/auth.middleware";
import { refreshLimiter } from "../middleware/rate-limiter.middleware";

const router = Router();

// ==========================================
// 1. GET /api/risk-zones (List & filter by region/district)
// ==========================================
router.get("/", async (req, res: Response) => {
  try {
    const { region, district, division, disasterType, riskLevel, isActive } = req.query;
    const db = getDB();

    const query: any = {};
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    } else {
      query.isActive = true; // Default to active risk zones
    }

    const searchRegion = (region || district || division) as string;
    if (searchRegion && searchRegion !== "All Regions" && searchRegion !== "All Districts") {
      const regex = new RegExp(searchRegion, "i");
      query.$or = [
        { district: regex },
        { division: regex },
        { title: regex },
      ];
    }

    if (disasterType) query.disasterType = String(disasterType);
    if (riskLevel) query.riskLevel = String(riskLevel);

    const riskZones = await db
      .collection("risk_zones")
      .find(query)
      .sort({ riskScore: -1 })
      .toArray();

    const formattedZones = riskZones.map((z) => ({
      ...z,
      _id: z._id.toString(),
    }));

    return res.json({
      success: true,
      data: {
        count: formattedZones.length,
        riskZones: formattedZones,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 2. GET /api/risk-zones/intersects (Point-in-Polygon Check)
// ==========================================
router.get("/intersects", async (req, res: Response) => {
  try {
    const { lng, lat } = req.query;
    if (!lng || !lat) {
      return res.status(400).json({
        success: false,
        message: "Query parameters 'lng' and 'lat' are required",
      });
    }

    const point = {
      type: "Point",
      coordinates: [parseFloat(String(lng)), parseFloat(String(lat))],
    };

    const db = getDB();
    const intersectingZones = await db
      .collection("risk_zones")
      .find({
        isActive: true,
        geometry: {
          $geoIntersects: {
            $geometry: point,
          },
        },
      })
      .toArray();

    const formattedZones = intersectingZones.map((z) => ({
      ...z,
      _id: z._id.toString(),
    }));

    return res.json({
      success: true,
      data: {
        inRiskZone: formattedZones.length > 0,
        count: formattedZones.length,
        riskZones: formattedZones,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 3. POST /api/risk-zones/refresh (Live Weather Refresh - Admin / Coordinator only)
// ==========================================
router.post(
  "/refresh",
  refreshLimiter,
  authenticate,
  requireRole(["ADMIN", "COORDINATOR"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = getDB();
      const riskZones = await db.collection("risk_zones").find({ isActive: true }).toArray();

      const updateLogs: string[] = [];

      for (const zone of riskZones) {
        if (!zone.geometry?.coordinates?.[0]?.[0]) continue;

        // Centroid approximation from coordinates
        const [lng, lat] = zone.geometry.coordinates[0][0];

        // Fetch live weather data from OpenWeather API
        const weatherData = await fetchWeatherData(lat, lng);

        if (weatherData) {
          const scoring = calculateRiskScore({
            rainfallMm24h: weatherData.rainfallMm24h,
            riverWaterLevelMeters: weatherData.riverWaterLevelMeters,
            elevationMeters: weatherData.elevationMeters,
          });

          await db.collection("risk_zones").updateOne(
            { _id: zone._id },
            {
              $set: {
                rainfallMm24h: weatherData.rainfallMm24h,
                riverWaterLevelMeters: weatherData.riverWaterLevelMeters,
                elevationMeters: weatherData.elevationMeters,
                riskScore: scoring.riskScore,
                riskLevel: scoring.riskLevel,
                updatedBy: "WEATHER_API",
                updatedAt: new Date(),
              },
            }
          );
          updateLogs.push(`Updated ${zone.title} (Live Rain: ${weatherData.rainfallMm24h}mm, Score: ${scoring.riskScore})`);
        } else {
          updateLogs.push(`Retained seeded fallback details for ${zone.title} (Fetch Failed)`);
        }
      }

      return res.json({
        success: true,
        message: "Disaster risk zone maps refreshed with live weather heuristics",
        data: {
          processedCount: riskZones.length,
          logs: updateLogs,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ==========================================
// 4. GET /api/risk-zones/:id (Fetch single risk zone)
// ==========================================
router.get("/:id", async (req, res: Response) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid risk zone ID format" });
    }

    const db = getDB();
    const zone = await db.collection("risk_zones").findOne({ _id: new ObjectId(id) });

    if (!zone) {
      return res.status(404).json({ success: false, message: "Risk zone not found" });
    }

    return res.json({
      success: true,
      data: {
        ...zone,
        _id: zone._id.toString(),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 5. POST /api/risk-zones (Create - Admin / Coordinator only)
// ==========================================
router.post(
  "/",
  authenticate,
  requireRole(["ADMIN", "COORDINATOR"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parseResult = CreateRiskZoneDTO.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Validation error for risk zone creation",
          errors: parseResult.error.errors,
        });
      }

      const data = parseResult.data;

      // Auto-calculate risk score & level if not explicitly overridden
      const scoring = calculateRiskScore({
        rainfallMm24h: data.rainfallMm24h || 0,
        riverWaterLevelMeters: data.riverWaterLevelMeters || 0,
        elevationMeters: data.elevationMeters || 5,
      });

      const newRiskZone = {
        ...data,
        riskScore: data.riskScore ?? scoring.riskScore,
        riskLevel: data.riskLevel ?? scoring.riskLevel,
        updatedBy: req.user?.email || "ADMIN",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const db = getDB();
      const result = await db.collection("risk_zones").insertOne(newRiskZone);

      return res.status(201).json({
        success: true,
        message: "Risk zone polygon created successfully",
        data: {
          id: result.insertedId.toString(),
          ...newRiskZone,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ==========================================
// 6. PATCH /api/risk-zones/:id (Update - Admin / Coordinator only)
// ==========================================
router.patch(
  "/:id",
  authenticate,
  requireRole(["ADMIN", "COORDINATOR"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid risk zone ID format" });
      }

      const parseResult = UpdateRiskZoneDTO.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Validation error for risk zone update",
          errors: parseResult.error.errors,
        });
      }

      const updates: any = {
        ...parseResult.data,
        updatedBy: req.user?.email || "ADMIN",
        updatedAt: new Date(),
      };

      // Recalculate score if weather/water variables updated
      if (
        updates.rainfallMm24h !== undefined ||
        updates.riverWaterLevelMeters !== undefined ||
        updates.elevationMeters !== undefined
      ) {
        const db = getDB();
        const existing = await db.collection("risk_zones").findOne({ _id: new ObjectId(id) });
        if (existing) {
          const scoring = calculateRiskScore({
            rainfallMm24h: updates.rainfallMm24h ?? existing.rainfallMm24h ?? 0,
            riverWaterLevelMeters: updates.riverWaterLevelMeters ?? existing.riverWaterLevelMeters ?? 0,
            elevationMeters: updates.elevationMeters ?? existing.elevationMeters ?? 5,
          });
          if (!updates.riskScore) updates.riskScore = scoring.riskScore;
          if (!updates.riskLevel) updates.riskLevel = scoring.riskLevel;
        }
      }

      const db = getDB();
      const result = await db
        .collection("risk_zones")
        .findOneAndUpdate({ _id: new ObjectId(id) }, { $set: updates }, { returnDocument: "after" });

      if (!result) {
        return res.status(404).json({ success: false, message: "Risk zone record not found" });
      }

      return res.json({
        success: true,
        message: "Risk zone parameters updated successfully",
        data: {
          ...result,
          _id: result._id.toString(),
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

export default router;
