import { Router, Response } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db";
import {
  CreateShelterDTO,
  UpdateShelterDTO,
  NearbyShelterQueryDTO,
} from "@rakkhanet/shared-types";
import { authenticate, requireRole, AuthenticatedRequest } from "../middleware/auth.middleware";

const router = Router();

// ==========================================
// 1. GET /api/shelters/nearby (Geospatial $near query)
// ==========================================
router.get("/nearby", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = NearbyShelterQueryDTO.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters for nearby shelter search",
        errors: parseResult.error.errors,
      });
    }

    const { lat, lng, maxDistance, district, minCapacity } = parseResult.data;
    const db = getDB();

    // MongoDB 2dsphere aggregation using $geoNear to include calculated distance
    const pipeline: any[] = [
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [lng, lat],
          },
          distanceField: "distanceMeters",
          maxDistance: maxDistance,
          spherical: true,
        },
      },
    ];

    // Optional query match filters
    const matchFilter: any = {};
    if (district) {
      matchFilter.district = { $regex: new RegExp(district, "i") };
    }
    if (minCapacity) {
      matchFilter.$expr = {
        $gte: [{ $subtract: ["$capacity", "$currentOccupancy"] }, minCapacity],
      };
    }

    if (Object.keys(matchFilter).length > 0) {
      pipeline.push({ $match: matchFilter });
    }

    const shelters = await db.collection("shelters").aggregate(pipeline).toArray();

    const formattedShelters = shelters.map((s) => ({
      ...s,
      _id: s._id.toString(),
      distanceMeters: Math.round(s.distanceMeters),
      availableCapacity: Math.max(0, s.capacity - (s.currentOccupancy || 0)),
      occupancyPercentage: Math.min(100, Math.round(((s.currentOccupancy || 0) / s.capacity) * 100)),
    }));

    return res.json({
      success: true,
      data: {
        count: formattedShelters.length,
        userLocation: { lat, lng },
        maxDistanceMeters: maxDistance,
        shelters: formattedShelters,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 2. GET /api/shelters (List with optional filters)
// ==========================================
router.get("/", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDB();
    const { district, upazila, status, minAvailable } = req.query;

    const filter: any = {};
    if (district) filter.district = { $regex: new RegExp(String(district), "i") };
    if (upazila) filter.upazila = { $regex: new RegExp(String(upazila), "i") };
    if (status) filter.status = String(status);

    const shelters = await db.collection("shelters").find(filter).toArray();

    let result = shelters.map((s) => ({
      ...s,
      _id: s._id.toString(),
      availableCapacity: Math.max(0, s.capacity - (s.currentOccupancy || 0)),
      occupancyPercentage: Math.min(100, Math.round(((s.currentOccupancy || 0) / s.capacity) * 100)),
    }));

    if (minAvailable) {
      const minCap = Number(minAvailable);
      result = result.filter((s) => s.availableCapacity >= minCap);
    }

    return res.json({
      success: true,
      data: {
        count: result.length,
        shelters: result,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 3. GET /api/shelters/:id (Get by ID)
// ==========================================
router.get("/:id", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid shelter ID format" });
    }

    const db = getDB();
    const shelter = await db.collection("shelters").findOne({ _id: new ObjectId(id) });

    if (!shelter) {
      return res.status(404).json({ success: false, message: "Shelter record not found" });
    }

    return res.json({
      success: true,
      data: {
        ...shelter,
        _id: shelter._id.toString(),
        availableCapacity: Math.max(0, shelter.capacity - (shelter.currentOccupancy || 0)),
        occupancyPercentage: Math.min(100, Math.round(((shelter.currentOccupancy || 0) / shelter.capacity) * 100)),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 4. POST /api/shelters (Create shelter - Admin/Coordinator only)
// ==========================================
router.post(
  "/",
  authenticate,
  requireRole(["ADMIN", "COORDINATOR"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parseResult = CreateShelterDTO.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Validation error for new shelter creation",
          errors: parseResult.error.errors,
        });
      }

      const data = parseResult.data;
      const db = getDB();

      const newShelter = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection("shelters").insertOne(newShelter);

      return res.status(201).json({
        success: true,
        message: "Emergency shelter created successfully",
        data: {
          id: result.insertedId.toString(),
          ...newShelter,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ==========================================
// 5. PATCH /api/shelters/:id (Update shelter - Admin/Coordinator/Volunteer)
// ==========================================
router.patch(
  "/:id",
  authenticate,
  requireRole(["ADMIN", "COORDINATOR", "VOLUNTEER"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid shelter ID format" });
      }

      const parseResult = UpdateShelterDTO.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Validation error for shelter update",
          errors: parseResult.error.errors,
        });
      }

      const updates = {
        ...parseResult.data,
        updatedAt: new Date(),
      };

      const db = getDB();
      const result = await db
        .collection("shelters")
        .findOneAndUpdate({ _id: new ObjectId(id) }, { $set: updates }, { returnDocument: "after" });

      if (!result) {
        return res.status(404).json({ success: false, message: "Shelter record not found" });
      }

      return res.json({
        success: true,
        message: "Shelter updated successfully",
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
