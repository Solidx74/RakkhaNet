import { z } from "zod";
import { objectIdStringSchema } from "./common.js";

export const resourceCreateSchema = z.object({
  shelterId: objectIdStringSchema,
  type: z.enum(["food", "water", "medicine", "blankets", "fuel", "other"]),
  quantity: z.number().nonnegative(),
  unit: z.enum(["kg", "liters", "pieces", "packs"]),
});
export type ResourceCreateInput = z.infer<typeof resourceCreateSchema>;

export const resourceSchema = resourceCreateSchema.extend({
  _id: objectIdStringSchema,
  lastRestocked: z.coerce.date(),
});
export type Resource = z.infer<typeof resourceSchema>;

export const resourceUpdateSchema = resourceCreateSchema.partial();
export type ResourceUpdateInput = z.infer<typeof resourceUpdateSchema>;
