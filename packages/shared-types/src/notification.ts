import { z } from "zod";
import { objectIdStringSchema } from "./common.js";

export const notificationCreateSchema = z.object({
  // Exactly one of userId (targeted) or region (broadcast) should be set --
  // validated in the route handler rather than here, since Zod's XOR
  // ergonomics aren't worth the complexity for a two-field case.
  userId: objectIdStringSchema.optional(),
  region: z.string().optional(),
  message: z.string().min(1).max(500),
  type: z.enum(["alert", "evacuation", "info"]),
  channel: z.enum(["push", "sms", "email"]),
});
export type NotificationCreateInput = z.infer<typeof notificationCreateSchema>;

export const notificationSchema = notificationCreateSchema.extend({
  _id: objectIdStringSchema,
  sentAt: z.coerce.date(),
});
export type Notification = z.infer<typeof notificationSchema>;
