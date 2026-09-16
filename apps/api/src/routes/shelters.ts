import { Router } from "express";
import { ObjectId } from "mongodb";
import {
  shelterCreateSchema,
  shelterUpdateSchema,
} from "@rakkhanet/shared-types";
import { getDb } from "../db/connection.js";
import { asyncHandler, ApiError } from "../middleware/errorHandler.js";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";
import type { Auth } from "../auth.js";

export function createShelterRouter(auth: Auth) {
  const router = Router();

  // GET /api/shelters -- deliberately public, no requireAuth. Finding a
  // shelter during a disaster cannot require an account first.
  router.get(
    "/",
    asyncHandler(async (_req, res) => {
      const shelters = await getDb().collection("shelters").find().toArray();
      res.json({ shelters });
    }),
  );

  // Must be registered before "/:id" or Express matches "nearby" as an :id.
  router.get(
    "/nearby",
    asyncHandler(async (req, res) => {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      const radiusKm = req.query.radius
        ? parseFloat(req.query.radius as string)
        : 20;

      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        throw new ApiError(400, "lat and lng query params are required");
      }

      const shelters = await getDb()
        .collection("shelters")
        .find({
          location: {
            $near: {
              $geometry: { type: "Point", coordinates: [lng, lat] },
              $maxDistance: radiusKm * 1000,
            },
          },
        })
        .toArray();

      res.json({ shelters });
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const shelter = await getDb()
        .collection("shelters")
        .findOne({ _id: new ObjectId(req.params.id) });
      if (!shelter) throw new ApiError(404, "Shelter not found");
      res.json({ shelter });
    }),
  );

  router.post(
    "/",
    requireAuth(auth),
    requireRole("admin"),
    asyncHandler(async (req, res) => {
      const input = shelterCreateSchema.parse(req.body);
      const now = new Date();
      const result = await getDb()
        .collection("shelters")
        .insertOne({ ...input, createdAt: now, updatedAt: now });
      res.status(201).json({
        _id: result.insertedId,
        ...input,
        createdAt: now,
        updatedAt: now,
      });
    }),
  );

  // Volunteers can update occupancy/status from the field, not just admins --
  // that's the whole point of the volunteer stakeholder interview's feedback.
  router.patch(
    "/:id",
    requireAuth(auth),
    requireRole("volunteer", "coordinator", "admin"),
    asyncHandler(async (req, res) => {
      const input = shelterUpdateSchema.parse(req.body);
      const result = await getDb()
        .collection("shelters")
        .findOneAndUpdate(
          { _id: new ObjectId(req.params.id) },
          { $set: { ...input, updatedAt: new Date() } },
          { returnDocument: "after" },
        );
      if (!result) throw new ApiError(404, "Shelter not found");
      res.json({ shelter: result });
    }),
  );

  return router;
}
