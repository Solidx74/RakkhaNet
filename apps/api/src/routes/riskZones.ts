import { Router } from "express";
import { riskZoneComputeSchema } from "@rakkhanet/shared-types";
import { getDb } from "../db/connection.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";
import { computeRiskScore } from "../lib/riskScoring.js";
import type { Auth } from "../auth.js";

export function createRiskZoneRouter(auth: Auth) {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const filter = req.query.region
        ? { region: req.query.region as string }
        : {};
      const riskZones = await getDb()
        .collection("risk_zones")
        .find(filter)
        .toArray();
      res.json({ riskZones });
    }),
  );

  router.post(
    "/",
    requireAuth(auth),
    requireRole("admin"),
    asyncHandler(async (req, res) => {
      const input = riskZoneComputeSchema.parse(req.body);
      const { riskScore, riskLevel } = computeRiskScore(input.inputs);

      const doc = {
        region: input.region,
        hazardType: input.hazardType,
        geometry: input.geometry,
        inputs: input.inputs,
        riskScore,
        riskLevel,
        lastUpdated: new Date(),
      };

      const result = await getDb().collection("risk_zones").insertOne(doc);
      res.status(201).json({ _id: result.insertedId, ...doc });
    }),
  );

  return router;
}
