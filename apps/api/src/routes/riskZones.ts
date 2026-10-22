import { Router } from "express";
import { riskZoneComputeSchema } from "@rakkhanet/shared-types";
import { getDb } from "../db/connection.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";
import { getRiskAssessment } from "../lib/aiServiceClient.js";
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

      // Tries the AI service first and falls back to the v1 rule on any
      // failure, so this never throws because the AI service is down.
      const assessment = await getRiskAssessment(
        auth,
        req.headers,
        input.inputs,
      );

      const doc = {
        region: input.region,
        hazardType: input.hazardType,
        geometry: input.geometry,
        inputs: input.inputs,
        riskScore: assessment.riskScore,
        riskLevel: assessment.riskLevel,
        // Which path produced riskLevel -- the Risk Map badge in 4d reads this.
        scoredBy: assessment.source,
        // Spread conditionally rather than assigning `undefined`: the Mongo
        // driver stores undefined as null, which would put misleading
        // null fields on every rule-scored zone.
        ...(assessment.source === "ai" && {
          confidence: assessment.confidence,
          probabilities: assessment.probabilities,
        }),
        lastUpdated: new Date(),
      };

      const result = await getDb().collection("risk_zones").insertOne(doc);
      res.status(201).json({ _id: result.insertedId, ...doc });
    }),
  );

  return router;
}
