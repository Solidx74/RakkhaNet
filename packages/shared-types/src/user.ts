import { z } from "zod";
import { geoPointSchema, userRoleSchema } from "./common.js";

/**
 * Better Auth owns id/email/name/emailVerified/etc. This schema covers the
 * app-specific fields we add on top via `user.additionalFields` in the auth
 * config -- keep it in sync with apps/api/src/auth.ts when you change either.
 */
export const userAdditionalFieldsSchema = z.object({
  role: userRoleSchema.default("citizen"),
  phone: z.string().optional(),
  location: geoPointSchema.optional(),
});
export type UserAdditionalFields = z.infer<typeof userAdditionalFieldsSchema>;
