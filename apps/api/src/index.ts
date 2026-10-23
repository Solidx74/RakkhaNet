import "dotenv/config";
import { createServer } from "http";
import cors from "cors";
import express from "express";
import { Server as SocketIOServer } from "socket.io";
import { toNodeHandler } from "better-auth/node";
import { connectToDatabase, getDb, getMongoClient } from "./db/connection.js";
import { createAuth } from "./auth.js";
import { requestLogger } from "./middleware/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requireAuth, requireRole } from "./middleware/requireAuth.js";
import { createShelterRouter } from "./routes/shelters.js";
import { createRiskZoneRouter } from "./routes/riskZones.js";
import { createReliefRequestRouter } from "./routes/reliefRequests.js";
import { createResourceRouter } from "./routes/resources.js";
import { createEvacuationRouter } from "./routes/evacuation.js";
import { createAdminUsersRouter } from "./routes/adminUsers.js";

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
