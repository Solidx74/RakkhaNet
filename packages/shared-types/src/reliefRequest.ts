import { z } from "zod";
import {
  geoPointSchema,
  objectIdStringSchema,
  userIdStringSchema,
} from "./common.js";

// Single source of truth for the four priority levels -- used by the
// citizen-set `priority`, the AI's `suggestedPriority`, and the API client.
export const reliefPrioritySchema = z.enum([
  "low",
  "medium",
  "high",
  "critical",
]);
export type ReliefPriority = z.infer<typeof reliefPrioritySchema>;

export const reliefRequestCreateSchema = z.object({
  requesterId: userIdStringSchema,
  location: geoPointSchema,
  description: z.string().min(1).max(1000),
  category: z.enum(["food", "medical", "rescue", "shelter", "other"]),
  // Set by the citizen as a first guess; AI triage in Phase 3 may override this.
  priority: reliefPrioritySchema.default("medium"),
});
// z.input, not z.infer -- priority has .default("medium"), so it should be
// optional in what a caller provides. Same fix as ShelterCreateInput.
export type ReliefRequestCreateInput = z.input<
  typeof reliefRequestCreateSchema
>;

/**
 * The AI service's suggested priority for a request. A HINT only: it lives
 * in its own field and never replaces `priority`, which stays whatever the
 * citizen or a coordinator set. Deliberately NOT part of the create schema,
 * so a client can't send one -- only the server writes it.
 */
export const prioritySuggestionSchema = z.object({
  priority: reliefPrioritySchema,
  /** Probability of the suggested class, 0-1. */
  confidence: z.number().min(0).max(1),
});
export type PrioritySuggestion = z.infer<typeof prioritySuggestionSchema>;

export const reliefRequestSchema = reliefRequestCreateSchema.extend({
  _id: objectIdStringSchema,
  status: z
    .enum(["pending", "assigned", "in_progress", "resolved"])
    .default("pending"),
  assignedVolunteerId: userIdStringSchema.nullable().default(null),
  // Absent when the AI service was down, wasn't confident, or hasn't
  // answered yet (the hint is added shortly AFTER the request is created).
  suggestedPriority: prioritySuggestionSchema.optional(),
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
