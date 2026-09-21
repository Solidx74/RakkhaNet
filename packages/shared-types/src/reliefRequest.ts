import { z } from "zod";
import {
  geoPointSchema,
  objectIdStringSchema,
  userIdStringSchema,
} from "./common.js";

export const reliefRequestCreateSchema = z.object({
  requesterId: userIdStringSchema,
  location: geoPointSchema,
  description: z.string().min(1).max(1000),
  category: z.enum(["food", "medical", "rescue", "shelter", "other"]),
  // Set by the citizen as a first guess; AI triage in Phase 3 may override this.
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
});
// z.input, not z.infer -- priority has .default("medium"), so it should be
// optional in what a caller provides. Same fix as ShelterCreateInput.
export type ReliefRequestCreateInput = z.input<
  typeof reliefRequestCreateSchema
>;

export const reliefRequestSchema = reliefRequestCreateSchema.extend({
  _id: objectIdStringSchema,
  status: z
    .enum(["pending", "assigned", "in_progress", "resolved"])
    .default("pending"),
  assignedVolunteerId: userIdStringSchema.nullable().default(null),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type ReliefRequest = z.infer<typeof reliefRequestSchema>;

export const reliefRequestAssignSchema = z.object({
  volunteerId: userIdStringSchema,
});
export type ReliefRequestAssignInput = z.infer<
  typeof reliefRequestAssignSchema
>;

export const reliefRequestStatusUpdateSchema = z.object({
  status: z.enum(["pending", "assigned", "in_progress", "resolved"]),
});
export type ReliefRequestStatusUpdateInput = z.infer<
  typeof reliefRequestStatusUpdateSchema
>;
