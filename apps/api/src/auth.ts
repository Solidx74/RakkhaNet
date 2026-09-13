import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { jwt } from "better-auth/plugins";
import type { Db, MongoClient } from "mongodb";

/**
 * Factory instead of a module-level `export const auth = betterAuth(...)`,
 * because the Mongo connection has to be awaited first (see index.ts) --
 * Better Auth needs a live Db/MongoClient at construction time, not a promise.
 */
export function createAuth(db: Db, client: MongoClient) {
  return betterAuth({
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
    user: {
      additionalFields: {
        role: {
          type: "string",
          input: false,
          defaultValue: "citizen",
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
