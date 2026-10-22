import "dotenv/config";
import { createServer } from "http";
import cors from "cors";
import express from "express";
import { Server as SocketIOServer } from "socket.io";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { connectToDatabase, getDb, getMongoClient } from "./db/connection.js";
import { createAuth } from "./auth.js";
import { requestLogger } from "./middleware/logger.js";
import {
  errorHandler,
  asyncHandler,
  ApiError,
} from "./middleware/errorHandler.js";
import { requireAuth, requireRole } from "./middleware/requireAuth.js";
import { createShelterRouter } from "./routes/shelters.js";
import { createRiskZoneRouter } from "./routes/riskZones.js";
import { createReliefRequestRouter } from "./routes/reliefRequests.js";
import { createResourceRouter } from "./routes/resources.js";
import { createEvacuationRouter } from "./routes/evacuation.js";
import { createAdminUsersRouter } from "./routes/adminUsers.js";
import { getRiskAssessment } from "./lib/aiServiceClient.js";

/**
 * Reads an optional numeric query param. Absent -> undefined (so we can test
 * the "missing input" path); present but not a finite number -> 400.
 */
function parseOptionalNumber(value: unknown, name: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim() === "") {
    throw new ApiError(400, `${name} must be a number`);
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new ApiError(400, `${name} must be a number`);
  }
  return n;
}

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

  app.use("/api/admin/users", createAdminUsersRouter(auth));

  app.use("/api/shelters", createShelterRouter(auth));
  app.use("/api/risk-zones", createRiskZoneRouter(auth));
  app.use("/api/resources", createResourceRouter(auth));
  app.use("/api/evacuation", createEvacuationRouter());

  // Socket.io shares the same HTTP server as Express -- not a separate
  // port/process. Created here, before errorHandler, because
  // createReliefRequestRouter needs `io` to broadcast on
  // create/assign/status-change, and that router -- like every route --
  // must be mounted before the error handler, not after.
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
      credentials: true,
    },
  });

  app.use("/api/relief-requests", createReliefRequestRouter(auth, io));

  // Temporary diagnostic route for 4a-6 -- proves the full chain (Express
  // mints a JWT via Better Auth -> AI service verifies it against Better
  // Auth's JWKS) actually works end-to-end. Superseded once 4b/4c add real
  // AI routes that use the same token-minting pattern; safe to delete then.
  app.get(
    "/api/ai-check",
    requireAuth(auth),
    asyncHandler(async (req, res) => {
      const tokenResult = await auth.api.getToken({
        headers: fromNodeHeaders(req.headers),
      });

      const aiUrl = process.env.AI_SERVICE_URL ?? "http://localhost:8001";
      const aiRes = await fetch(`${aiUrl}/whoami`, {
        headers: { Authorization: `Bearer ${tokenResult.token}` },
      });

      if (!aiRes.ok) {
        throw new ApiError(502, "AI service rejected the token");
      }

      res.json({ aiServiceSaw: await aiRes.json() });
    }),
  );

  // Temporary diagnostic route for 4b-5-4 -- runs getRiskAssessment() on
  // query-string inputs so both paths (AI up -> source "ai", AI down ->
  // source "rule") can be seen from a browser. Safe to delete now that
  // getRiskAssessment() is wired into the real POST /api/risk-zones route.
  // Example: /api/risk-check?rainfallMm=250&riverLevelM=9&elevationM=2
  app.get(
    "/api/risk-check",
    requireAuth(auth),
    asyncHandler(async (req, res) => {
      const inputs = {
        rainfallMm: parseOptionalNumber(req.query.rainfallMm, "rainfallMm"),
        riverLevelM: parseOptionalNumber(req.query.riverLevelM, "riverLevelM"),
        elevationM: parseOptionalNumber(req.query.elevationM, "elevationM"),
      };

      const assessment = await getRiskAssessment(auth, req.headers, inputs);
      res.json({ inputs, assessment });
    }),
  );

  // Must be mounted LAST, after every route above.
  app.use(errorHandler);

  const port = Number(process.env.PORT) || 8080;
  httpServer.listen(port, () => {
    console.log(`[api] listening on port ${port}`);
  });
}

main().catch((err) => {
  console.error("[api] failed to start:", err);
  process.exit(1);
});
