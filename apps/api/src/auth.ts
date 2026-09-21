import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { jwt } from "better-auth/plugins";
import type { Db, MongoClient } from "mongodb";

/**
 * Factory instead of a module-level `export const auth = betterAuth(...)`,
 * because the Mongo connection has to be awaited first (see index.ts) --
 * Better Auth needs a live Db/MongoClient at construction time, not a promise.
 */
// Roles a person can select for themselves at signup. "coordinator" and
// "admin" are deliberately excluded -- those carry real permissions
// (resource management, shelter creation) and must be granted by an
// existing admin, not self-selected. This list is the actual security
// boundary; the signup form only ever showing these two is just UX.

const SELF_SIGNUP_ROLES = ["citizen", "volunteer"] as const;

export function createAuth(db: Db, client: MongoClient) {
  return betterAuth({
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:8080",
    database: mongodbAdapter(db, { client }),

    emailAndPassword: {
      enabled: true,
    },

    // The Next.js app is a different origin (different port/deploy target),
    // so it has to be explicitly trusted for Better Auth's cookie/CORS checks.
    trustedOrigins: [process.env.WEB_ORIGIN ?? "http://localhost:3000"],

    // Extends the user document with our own role field. `input: false` is
    // load-bearing: it stops a signup request from setting its own role by
    // just adding a `role` field to the request body.
    // `input: true` now -- the signup form is allowed to suggest a role.
    // What it's allowed to become is enforced below in databaseHooks, not
    // here. Never rely on `additionalFields` alone to keep this safe.
    user: {
      additionalFields: {
        role: {
          type: "string",
          input: true,
          required: false,
          defaultValue: "citizen",
        },
      },
    },

    // This is the actual security boundary for self-service signup. No
    // matter what a client sends as `role` -- including a hand-crafted API
    // request that never touches the sign-up form at all -- anything other
    // than "citizen" or "volunteer" is silently clamped to "citizen".
    // Promoting someone to "coordinator" or "admin" has to happen some other
    // way (direct DB update for now; an admin panel is future scope).
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const requestedRole = (user as { role?: unknown }).role;
            const role = SELF_SIGNUP_ROLES.includes(
              requestedRole as (typeof SELF_SIGNUP_ROLES)[number],
            )
              ? requestedRole
              : "citizen";
            return { data: { ...user, role } };
          },
        },
      },
    },

    // Issues short-lived JWTs (via /api/auth/token) + a JWKS endpoint
    // (/api/auth/jwks). This is NOT how the Express API itself checks who's
    // logged in -- that uses Better Auth's own session cookie directly (see
    // middleware/requireAuth.ts). The JWT plugin exists for services that
    // aren't Better Auth-aware, like the Python AI microservice in Phase 3.
    plugins: [jwt()],
  });
}

export type Auth = ReturnType<typeof createAuth>;
