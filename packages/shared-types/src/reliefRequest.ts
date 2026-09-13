import { z } from "zod";
import { geoPointSchema, objectIdStringSchema } from "./common.js";

export const reliefRequestCreateSchema = z.object({
  requesterId: objectIdStringSchema,
  location: geoPointSchema,
  description: z.string().min(1).max(1000),
  category: z.enum(["food", "medical", "rescue", "shelter", "other"]),
  // Set by the citizen as a first guess; AI triage in Phase 3 may override this.
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
});
export type ReliefRequestCreateInput = z.infer<
  typeof reliefRequestCreateSchema
>;

export const reliefRequestSchema = reliefRequestCreateSchema.extend({
  _id: objectIdStringSchema,
  status: z
    .enum(["pending", "assigned", "in_progress", "resolved"])
    .default("pending"),
  assignedVolunteerId: objectIdStringSchema.nullable().default(null),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type ReliefRequest = z.infer<typeof reliefRequestSchema>;

export const reliefRequestAssignSchema = z.object({
  volunteerId: objectIdStringSchema,
});
export type ReliefRequestAssignInput = z.infer<
  typeof reliefRequestAssignSchema
>;
