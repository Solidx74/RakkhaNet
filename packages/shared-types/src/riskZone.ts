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
