import { Router } from "express";
import { ObjectId } from "mongodb";
import type { IncomingHttpHeaders } from "node:http";
import type { Server as SocketIOServer } from "socket.io";
import {
  reliefRequestCreateSchema,
  reliefRequestAssignSchema,
  reliefRequestStatusUpdateSchema,
} from "@rakkhanet/shared-types";
import { getDb } from "../db/connection.js";
import { asyncHandler, ApiError } from "../middleware/errorHandler.js";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";
import { getPriorityHint } from "../lib/aiServiceClient.js";
import type { Auth } from "../auth.js";

// Better Auth's default collection name for users (same one adminUsers.ts uses).
const USER_COLLECTION = "user";

// Plenty for a course-project deployment.
const MAX_VOLUNTEERS = 200;

/**
 * Matches a user's _id whether Better Auth stored it as an ObjectId or a
 * plain string (its ids aren't guaranteed to be valid ObjectIds). Cast to
 * `any` for the same reason as in adminUsers.ts: the driver's Filter type
 * only allows an ObjectId for _id.
 */
function userIdFilter(id: string) {
  return (
    ObjectId.isValid(id)
      ? { $or: [{ _id: new ObjectId(id) }, { _id: id }] }
      : { _id: id }
  ) as any;
}

export function createReliefRequestRouter(auth: Auth, io: SocketIOServer) {
  const router = Router();

  /**
   * Fire-and-forget: asks the AI service for a priority suggestion and, if it
   * gives a confident one, saves it on the request as `suggestedPriority`,
   * then tells connected dashboards to refresh. Runs AFTER the citizen has
   * already been answered, so a slow or dead AI service can never delay or
   * break filing a request.
   *
   * It only ever sets `suggestedPriority` -- never `priority`, which stays
   * whatever the citizen or a coordinator chose. getPriorityHint() never
   * throws; the try/catch covers the database write.
   */
  async function attachPriorityHint(
    requestId: ObjectId,
    headers: IncomingHttpHeaders,
    description: string,
  ) {
    try {
      const hint = await getPriorityHint(auth, headers, description);
      if (!hint) return; // no field at all, rather than a null one

      // updatedAt is deliberately left alone: it records changes made by
      // people, and a background hint isn't one.
      await getDb()
        .collection("relief_requests")
        .updateOne({ _id: requestId }, { $set: { suggestedPriority: hint } });
      io.emit("relief-requests:changed");
    } catch (err) {
      console.error(
        "[ai] couldn't save priority hint:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  // Any logged-in user can file a request -- always for themselves, never
  // on someone else's behalf (requesterId comes from the session, not the body).
  router.post(
    "/",
    requireAuth(auth),
    asyncHandler(async (req, res) => {
      const input = reliefRequestCreateSchema.parse({
        ...req.body,
        requesterId: req.user!.id,
      });
      const now = new Date();
      const doc = {
        ...input,
        status: "pending" as const,
        assignedVolunteerId: null,
        createdAt: now,
        updatedAt: now,
      };
      const result = await getDb().collection("relief_requests").insertOne(doc);
      io.emit("relief-requests:changed");
      res.status(201).json({ request: { _id: result.insertedId, ...doc } });

      // After the response is sent -- see attachPriorityHint.
      void attachPriorityHint(
        result.insertedId,
        req.headers,
        input.description,
      );
    }),
  );

  // GET /api/relief-requests           -> coordinator/admin see everything
  // GET /api/relief-requests?mine=true -> the logged-in user's own requests
  // A citizen asking for "everything" silently gets "mine" instead of a
  // 403 -- that's the only data they're entitled to anyway.
  router.get(
    "/",
    requireAuth(auth),
    asyncHandler(async (req, res) => {
      const mine = req.query.mine === "true";
      // Volunteers need to see the pool of requests to help with, not just
      // ones they personally submitted -- the "sensitive, not public" gate
      // from before was about keeping this from citizens/the public, not
      // from the operational staff who are meant to act on it.
      const canSeeAll = ["volunteer", "coordinator", "admin"].includes(
        req.user!.role,
      );

      const filter = mine || !canSeeAll ? { requesterId: req.user!.id } : {};
      // The AI's priority suggestion is a triage aid for operational staff.
      // Citizens never see it on their own requests -- it is a guess about
      // their emergency, not something they set or asked for.
      const projection = canSeeAll ? {} : { suggestedPriority: 0 };
      const requests = await getDb()
        .collection("relief_requests")
        .find(filter, { projection })
        .sort({ createdAt: -1 })
        .toArray();
      res.json({ requests });
    }),
  );

  // GET /api/relief-requests/volunteers -- who a coordinator/admin can assign.
  // Deliberately narrow: id + name only, never emails (the full user list in
  // /api/admin/users is admin-only because emails are personal data).
  router.get(
    "/volunteers",
    requireAuth(auth),
    requireRole("coordinator", "admin"),
    asyncHandler(async (_req, res) => {
      const docs = await getDb()
        .collection(USER_COLLECTION)
        .find({ role: "volunteer" }, { projection: { name: 1 } })
        .sort({ name: 1 })
        .limit(MAX_VOLUNTEERS)
        .toArray();

      const volunteers = docs.map((d) => ({
        // String() so it equals the id requireAuth puts on req.user.id.
        id: String(d._id),
        name:
          typeof d.name === "string" && d.name.trim()
            ? d.name
            : "Unnamed volunteer",
      }));

      res.json({ volunteers });
    }),
  );

  router.patch(
    "/:id/assign",
    requireAuth(auth),
    requireRole("volunteer", "coordinator", "admin"),
    asyncHandler(async (req, res) => {
      const { volunteerId } = reliefRequestAssignSchema.parse(req.body);

      // A volunteer can only ever assign themselves (self-accept a task).
      // Coordinators/admins can assign anyone.
      if (req.user!.role === "volunteer" && volunteerId !== req.user!.id) {
        throw new ApiError(
          403,
          "Volunteers can only assign themselves to a request",
        );
      }

      // "Anyone" still has to be a real volunteer account -- otherwise a
      // typo'd or made-up id would be stored as the assignee. (A volunteer
      // reaching this point was already checked above: they can only name
      // themselves.)
      if (req.user!.role !== "volunteer") {
        const target = await getDb()
          .collection(USER_COLLECTION)
          .findOne(userIdFilter(volunteerId), { projection: { role: 1 } });
        if (!target || target.role !== "volunteer") {
          throw new ApiError(
            400,
            "volunteerId must belong to a volunteer account",
          );
        }
      }

      const result = await getDb()
        .collection("relief_requests")
        .findOneAndUpdate(
          { _id: new ObjectId(req.params.id) },
          {
            $set: {
              assignedVolunteerId: volunteerId,
              status: "assigned",
              updatedAt: new Date(),
            },
          },
          { returnDocument: "after" },
        );
      if (!result) throw new ApiError(404, "Relief request not found");
      io.emit("relief-requests:changed");
      res.json({ request: result });
    }),
  );

  router.patch(
    "/:id/status",
    requireAuth(auth),
    requireRole("volunteer", "coordinator", "admin"),
    asyncHandler(async (req, res) => {
      const { status } = reliefRequestStatusUpdateSchema.parse(req.body);
      const result = await getDb()
        .collection("relief_requests")
        .findOneAndUpdate(
          { _id: new ObjectId(req.params.id) },
          { $set: { status, updatedAt: new Date() } },
          { returnDocument: "after" },
        );
      if (!result) throw new ApiError(404, "Relief request not found");
      io.emit("relief-requests:changed");
      res.json({ request: result });
    }),
  );

  return router;
}
