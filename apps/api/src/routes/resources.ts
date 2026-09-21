import { Router } from "express";
import { ObjectId } from "mongodb";
import {
  resourceCreateSchema,
  resourceUpdateSchema,
} from "@rakkhanet/shared-types";
import { getDb } from "../db/connection.js";
import { asyncHandler, ApiError } from "../middleware/errorHandler.js";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";
import type { Auth } from "../auth.js";

export function createResourceRouter(auth: Auth) {
  const router = Router();

  // GET /api/resources?shelterId=... -- public, same reasoning as shelters
  // themselves: knowing what a shelter has can't require login.
  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const filter: Record<string, unknown> = {};
      if (req.query.shelterId) {
        // shelterId references shelters._id, which IS a real ObjectId --
        // filtering with the raw string here would silently match nothing,
        // since MongoDB does not coerce string <-> ObjectId on comparison
        // even when the hex value is identical.
        filter.shelterId = new ObjectId(req.query.shelterId as string);
      }
      const resources = await getDb()
        .collection("resources")
        .find(filter)
        .toArray();
      res.json({ resources });
    }),
  );

  router.post(
    "/",
    requireAuth(auth),
    requireRole("volunteer", "coordinator", "admin"),
    asyncHandler(async (req, res) => {
      const input = resourceCreateSchema.parse(req.body);
      const doc = {
        ...input,
        shelterId: new ObjectId(input.shelterId),
        lastRestocked: new Date(),
      };
      const result = await getDb().collection("resources").insertOne(doc);
      res.status(201).json({ _id: result.insertedId, ...doc });
    }),
  );

  router.patch(
    "/:id",
    requireAuth(auth),
    requireRole("volunteer", "coordinator", "admin"),
    asyncHandler(async (req, res) => {
      const input = resourceUpdateSchema.parse(req.body);
      const update: Record<string, unknown> = {
        ...input,
        lastRestocked: new Date(),
      };
      if (input.shelterId) update.shelterId = new ObjectId(input.shelterId);
      const result = await getDb()
        .collection("resources")
        .findOneAndUpdate(
          { _id: new ObjectId(req.params.id) },
          { $set: update },
          { returnDocument: "after" },
        );
      if (!result) throw new ApiError(404, "Resource not found");
      res.json({ resource: result });
    }),
  );

  return router;
}
