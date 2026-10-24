import { z } from "zod";
import { geoPolygonSchema, objectIdStringSchema } from "./common.js";

export const riskLevelSchema = z.enum(["low", "medium", "high", "severe"]);
export type RiskLevel = z.infer<typeof riskLevelSchema>;

export const riskZoneCreateSchema = z.object({
  region: z.string().min(2).max(120),
  hazardType: z.enum(["flood", "cyclone"]),
  geometry: geoPolygonSchema,
  riskLevel: riskLevelSchema,
  riskScore: z.number().min(0).max(100),
  // Free-text inputs the v1 rule-based scorer used -- kept so the AI service
  // can later recompute/explain the score without re-deriving them.
  inputs: z
    .object({
      rainfallMm: z.number().nonnegative().optional(),
      riverLevelM: z.number().optional(),
      elevationM: z.number().optional(),
    })
    .optional(),
});
export type RiskZoneCreateInput = z.infer<typeof riskZoneCreateSchema>;

export const riskZoneSchema = riskZoneCreateSchema.extend({
  _id: objectIdStringSchema,
  lastUpdated: z.coerce.date(),
  // Written by the API since 4b-6 (see routes/riskZones.ts); deliberately
  // NOT on the create schemas above, so a client can't claim a zone was
  // AI-scored. All optional: zones created before 4b-6 have none of them,
  // and those were rule-scored, so a missing `scoredBy` means "rule".
  scoredBy: z.enum(["ai", "rule"]).optional(),
  /** Only present when scoredBy is "ai": probability of the predicted level, 0-1. */
  confidence: z.number().min(0).max(1).optional(),
  /** Only present when scoredBy is "ai": probability per level. */
  probabilities: z.record(z.string(), z.number()).optional(),
});
export type RiskZone = z.infer<typeof riskZoneSchema>;

/**
 * What the POST /api/risk-zones route actually accepts. Deliberately does
 * NOT include riskLevel/riskScore -- those are computed server-side by the
 * v1 rule-based scorer (see apps/api/src/lib/riskScoring.ts) from `inputs`,
 * never supplied directly by the client.
 */
export const riskZoneComputeSchema = z.object({
  region: z.string().min(2).max(120),
  hazardType: z.enum(["flood", "cyclone"]),
  geometry: geoPolygonSchema,
  inputs: z.object({
    rainfallMm: z.number().nonnegative().optional(),
    riverLevelM: z.number().optional(),
    elevationM: z.number().optional(),
  }),
});
export type RiskZoneComputeInput = z.infer<typeof riskZoneComputeSchema>;
