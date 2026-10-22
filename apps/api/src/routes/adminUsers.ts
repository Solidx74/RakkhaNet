import { Router } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getDb } from "../db/connection.js";
import { asyncHandler, ApiError } from "../middleware/errorHandler.js";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";
import type { Auth } from "../auth.js";

const ROLES = ["citizen", "volunteer", "coordinator", "admin"] as const;
type Role = (typeof ROLES)[number];

// Better Auth's default collection name for users (same one setRole.ts uses).
const USER_COLLECTION = "user";

// Plenty for a course-project deployment; a real pager can come later.
const MAX_USERS = 200;

// Allow-list, so nothing else on the user document leaks out.
const USER_PROJECTION = { name: 1, email: 1, role: 1, createdAt: 1 };

const roleChangeSchema = z.object({ role: z.enum(ROLES) });

function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

/** Shapes a raw user document into what the admin UI is allowed to see. */
function toAdminUser(d: Record<string, unknown>) {
  return {
    // String() so this is the same id requireAuth puts on req.user.id,
    // whether Better Auth stored _id as an ObjectId or a string.
    id: String(d._id),
    name: d.name ?? null,
    email: d.email ?? null,
    // Users without a role field are treated as citizens everywhere else
    // (see requireAuth.ts).
    role: typeof d.role === "string" ? d.role : "citizen",
    createdAt: d.createdAt ?? null,
  };
}

/**
 * Admin-only user management. Emails are personal data, so this is
 * deliberately NOT available to coordinators -- 6c adds a separate,
 * narrower endpoint (id + name only) for the "assign a specific volunteer"
 * control.
 */
export function createAdminUsersRouter(auth: Auth) {
  const router = Router();

  // Applies only to requests under this router's mount path.
  router.use(requireAuth(auth), requireRole("admin"));

  // GET /api/admin/users            -> all users, newest first
  // GET /api/admin/users?role=admin -> only that role
  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const roleParam = req.query.role;

      let filter: Record<string, unknown> = {};
      if (roleParam !== undefined) {
        if (typeof roleParam !== "string" || !isRole(roleParam)) {
          throw new ApiError(400, `role must be one of: ${ROLES.join(", ")}`);
        }
        // Users without a role field are citizens, so the filter has to
        // match them too.
        filter =
          roleParam === "citizen"
            ? { $or: [{ role: "citizen" }, { role: { $exists: false } }] }
            : { role: roleParam };
      }

      const docs = await getDb()
        .collection(USER_COLLECTION)
        .find(filter, { projection: USER_PROJECTION })
        .sort({ createdAt: -1 })
        .limit(MAX_USERS)
        .toArray();

      res.json({ users: docs.map(toAdminUser) });
    }),
  );

  // PATCH /api/admin/users/:id/role   body: { "role": "volunteer" }
  router.patch(
    "/:id/role",
    asyncHandler(async (req, res) => {
      const { role } = roleChangeSchema.parse(req.body);
      const id = req.params.id;

      // An admin changing their own role is the one way to lock yourself
      // out. Blocking it also means at least one admin always remains:
      // only an admin can demote an admin, and never themselves.
      if (id === req.user!.id) {
        throw new ApiError(400, "You can't change your own role");
      }

      // Match _id as an ObjectId or as a plain string, since Better Auth's
      // ids aren't guaranteed to be valid ObjectIds.
      const idFilter = (
        ObjectId.isValid(id)
          ? { $or: [{ _id: new ObjectId(id) }, { _id: id }] }
          : { _id: id }
      ) as any;

      const updated = await getDb()
        .collection(USER_COLLECTION)
        .findOneAndUpdate(
          idFilter,
          { $set: { role, updatedAt: new Date() } },
          { returnDocument: "after", projection: USER_PROJECTION },
        );

      if (!updated) throw new ApiError(404, "User not found");
      res.json({ user: toAdminUser(updated) });
    }),
  );

  return router;
}
