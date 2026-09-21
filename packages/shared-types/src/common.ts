import { z } from "zod";

/**
 * GeoJSON Point, matching what MongoDB expects for a 2dsphere-indexed field.
 * coordinates is [longitude, latitude] -- NOT [lat, lng]. This ordering trips
 * everyone up at least once; it's the #1 source of "my nearby query returns
 * nothing" bugs.
 */
export const geoPointSchema = z.object({
  type: z.literal("Point"),
  coordinates: z.tuple([z.number(), z.number()]), // [lng, lat]
});
export type GeoPoint = z.infer<typeof geoPointSchema>;

/**
 * GeoJSON Polygon, used for risk zone boundaries. Coordinates is an array of
 * linear rings; the first ring is the outer boundary. Each ring must start
 * and end with the same point (closed loop).
 */
export const geoPolygonSchema = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
});
export type GeoPolygon = z.infer<typeof geoPolygonSchema>;

export const userRoleSchema = z.enum([
  "citizen",
  "volunteer",
  "coordinator",
  "admin",
]);
export type UserRole = z.infer<typeof userRoleSchema>;

/** MongoDB ObjectId represented as its 24-char hex string over the wire.
 *  Use this for _id fields of OUR OWN native-driver collections (shelters,
 *  risk_zones, relief_requests, etc.) -- we control those IDs. */
export const objectIdStringSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Must be a valid MongoDB ObjectId");

/** References a user managed by Better Auth. Deliberately NOT validated as
 *  a Mongo ObjectId -- Better Auth generates its own ID format, which is
 *  not guaranteed to be a 24-char hex string. Use this (not
 *  objectIdStringSchema) for any field that points at a user, e.g.
 *  requesterId, assignedVolunteerId. */
export const userIdStringSchema = z.string().min(1);
