import { z } from "zod";
import { geoPointSchema, objectIdStringSchema } from "./common.js";

export const reportCreateSchema = z.object({
  userId: objectIdStringSchema,
  location: geoPointSchema,
  description: z.string().min(1).max(1000),
  images: z.array(z.string().url()).default([]),
  severity: z.enum(["low", "medium", "high"]),
});
export type ReportCreateInput = z.infer<typeof reportCreateSchema>;

export const reportSchema = reportCreateSchema.extend({
  _id: objectIdStringSchema,
  verified: z.boolean().default(false),
  createdAt: z.coerce.date(),
});
export type Report = z.infer<typeof reportSchema>;
