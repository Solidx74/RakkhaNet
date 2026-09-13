import { z } from "zod";
import { geoPointSchema, objectIdStringSchema } from "./common.js";

export const shelterResourceSchema = z.object({
  type: z.enum(["food", "water", "medicine", "blankets", "other"]),
  available: z.boolean().default(true),
});

/** Schema for creating a shelter (admin-only route). No _id, no server-set fields. */
export const shelterCreateSchema = z.object({
  name: z.string().min(2).max(120),
  location: geoPointSchema,
  address: z.string().min(2).max(300),
  capacity: z.number().int().positive(),
  currentOccupancy: z.number().int().nonnegative().default(0),
  resources: z.array(shelterResourceSchema).default([]),
  contactPerson: z.string().min(2).max(120),
  contactPhone: z.string().optional(),
  status: z.enum(["open", "full", "closed"]).default("open"),
});
export type ShelterCreateInput = z.infer<typeof shelterCreateSchema>;

/** Full document shape as stored in MongoDB, including server-set fields. */
export const shelterSchema = shelterCreateSchema.extend({
  _id: objectIdStringSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Shelter = z.infer<typeof shelterSchema>;

/** Partial update -- occupancy/status changes from a volunteer report. */
export const shelterUpdateSchema = shelterCreateSchema.partial();
export type ShelterUpdateInput = z.infer<typeof shelterUpdateSchema>;
