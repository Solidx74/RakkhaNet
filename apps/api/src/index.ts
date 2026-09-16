import "dotenv/config";
import cors from "cors";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { connectToDatabase, getDb, getMongoClient } from "./db/connection.js";
import { createAuth } from "./auth.js";
import { requestLogger } from "./middleware/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requireAuth, requireRole } from "./middleware/requireAuth.js";
import { createShelterRouter } from "./routes/shelters.js";
import { createRiskZoneRouter } from "./routes/riskZones.js";
import { createEvacuationRouter } from "./routes/evacuation.js";

async function main() {
  await connectToDatabase();
  const auth = createAuth(getDb(), getMongoClient());

  const app = express();

  app.use(
    cors({
      origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
      credentials: true, // required for Better Auth's session cookie
    }),
  );
  app.use(requestLogger);

  // Better Auth's own routes (sign-up, sign-in, session, jwt, jwks, ...).
  // Must be mounted BEFORE express.json() -- Better Auth parses the request
  // body itself, and express.json() would consume the stream first otherwise.
  app.all("/api/auth/*", toNodeHandler(auth));

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Example protected route -- Phase 2+ features follow this same pattern:
  // requireAuth(auth) alone for "any logged-in user", plus requireRole(...)
  // for admin-only mutations like creating a shelter.
  app.get("/api/me", requireAuth(auth), (req, res) => {
    res.json({ user: req.user });
  });
  app.get(
    "/api/admin/ping",
    requireAuth(auth),
    requireRole("admin"),
    (_req, res) => {
      res.json({ message: "you are an admin" });
    },
  );

  // Stub routes for the four feature areas -- replaced with real routers as
  // each phase is built. Kept here so the frontend has something to hit.
  app.use("/api/shelters", createShelterRouter(auth));
  app.use("/api/risk-zones", createRiskZoneRouter(auth));
  app.use("/api/evacuation", createEvacuationRouter());

  // Still a stub -- relief_requests is Phase 3.
  app.get("/api/relief-requests", (_req, res) => res.json({ requests: [] }));
  // app.get("/api/shelters", (_req, res) => res.json({ shelters: [] }));
  // app.get("/api/risk-zones", (_req, res) => res.json({ riskZones: [] }));
  // app.get("/api/relief-requests", (_req, res) => res.json({ requests: [] }));

  // Must be mounted LAST.
  app.use(errorHandler);

  const port = Number(process.env.PORT) || 8080;
  app.listen(port, () => {
    console.log(`[api] listening on port ${port}`);
  });
}

main().catch((err) => {
  console.error("[api] failed to start:", err);
  process.exit(1);
});
