import { z } from "zod";

// ==========================================
// GeoJSON Geometry Schemas
// ==========================================
export const GeoJSONPointSchema = z.object({
  type: z.literal("Point"),
  coordinates: z.tuple([z.number(), z.number()]), // [longitude, latitude]
});
export type GeoJSONPoint = z.infer<typeof GeoJSONPointSchema>;

export const GeoJSONPolygonSchema = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))), // [longitude, latitude]
});
export type GeoJSONPolygon = z.infer<typeof GeoJSONPolygonSchema>;

export const GeoJSONLineStringSchema = z.object({
  type: z.literal("LineString"),
  coordinates: z.array(z.tuple([z.number(), z.number()])), // [[longitude, latitude], ...]
});
export type GeoJSONLineString = z.infer<typeof GeoJSONLineStringSchema>;

// ==========================================
// 1. Users Collection
// ==========================================
export const UserRoleSchema = z.enum(["CITIZEN", "VOLUNTEER", "COORDINATOR", "ADMIN"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^(\+8801|01)[3-9]\d{8}$/, "Invalid Bangladeshi phone number"),
  passwordHash: z.string(),
  role: UserRoleSchema.default("CITIZEN"),
  division: z.string(),
  district: z.string(),
  upazila: z.string(),
  isVerified: z.boolean().default(false),
  assignedShelterId: z.string().nullable().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type User = z.infer<typeof UserSchema>;

export const SignUpDTO = UserSchema.pick({
  name: true,
  email: true,
  phone: true,
  division: true,
  district: true,
  upazila: true,
}).extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: UserRoleSchema.optional().default("CITIZEN"),
});
export type SignUpDTO = z.infer<typeof SignUpDTO>;

export const SignInDTO = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});
export type SignInDTO = z.infer<typeof SignInDTO>;

// ==========================================
// 2. Risk Zones Collection & Heuristic Scoring
// ==========================================
export const RiskLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const DisasterTypeSchema = z.enum(["FLOOD", "CYCLONE", "LANDSLIDE", "STORM_SURGE"]);
export type DisasterType = z.infer<typeof DisasterTypeSchema>;

export const RiskZoneSchema = z.object({
  _id: z.string().optional(),
  title: z.string().min(3, "Title must be at least 3 characters"),
  district: z.string(),
  division: z.string(),
  disasterType: DisasterTypeSchema,
  riskLevel: RiskLevelSchema.optional(),
  riskScore: z.number().min(0).max(100).optional(),
  rainfallMm24h: z.number().default(0),
  riverWaterLevelMeters: z.number().default(0),
  elevationMeters: z.number().default(5),
  geometry: GeoJSONPolygonSchema,
  warningLevel: z.string().optional(),
  affectedPopEstimate: z.number().default(0),
  isActive: z.boolean().default(true),
  updatedBy: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type RiskZone = z.infer<typeof RiskZoneSchema>;

export const CreateRiskZoneDTO = RiskZoneSchema.omit({ _id: true, createdAt: true, updatedAt: true });
export type CreateRiskZoneDTO = z.infer<typeof CreateRiskZoneDTO>;

export const UpdateRiskZoneDTO = RiskZoneSchema.partial().omit({ _id: true });
export type UpdateRiskZoneDTO = z.infer<typeof UpdateRiskZoneDTO>;

/**
 * Heuristic Rule-Based Risk Scoring Stub
 * Evaluates rainfall, river water level above danger mark, and ground elevation
 */
export function calculateRiskScore(inputs: {
  rainfallMm24h: number;
  riverWaterLevelMeters: number;
  elevationMeters: number;
}): { riskScore: number; riskLevel: RiskLevel } {
  const { rainfallMm24h, riverWaterLevelMeters, elevationMeters } = inputs;
  const rawScore = (rainfallMm24h * 0.35) + (riverWaterLevelMeters * 15.0) - (elevationMeters * 2.5);
  const riskScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  let riskLevel: RiskLevel = "LOW";
  if (riskScore >= 85) {
    riskLevel = "CRITICAL";
  } else if (riskScore >= 70) {
    riskLevel = "HIGH";
  } else if (riskScore >= 45) {
    riskLevel = "MEDIUM";
  } else {
    riskLevel = "LOW";
  }

  return { riskScore, riskLevel };
}

// ==========================================
// 3. Shelters Collection
// ==========================================
export const ShelterStatusSchema = z.enum(["OPEN", "FULL", "CLOSED", "INACCESSIBLE"]);
export type ShelterStatus = z.infer<typeof ShelterStatusSchema>;

export const ShelterAmenitiesSchema = z.object({
  hasCleanWater: z.boolean().default(true),
  hasElectricity: z.boolean().default(true),
  hasGenerator: z.boolean().default(false),
  hasMedicalFacility: z.boolean().default(false),
  separateWomenSpace: z.boolean().default(true),
});
export type ShelterAmenities = z.infer<typeof ShelterAmenitiesSchema>;

export const ShelterContactSchema = z.object({
  name: z.string(),
  phone: z.string(),
});
export type ShelterContact = z.infer<typeof ShelterContactSchema>;

export const ShelterSchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(3, "Shelter name must be at least 3 characters"),
  code: z.string().optional(),
  location: GeoJSONPointSchema,
  address: z.string(),
  division: z.string(),
  district: z.string(),
  upazila: z.string(),
  capacity: z.number().int().positive("Capacity must be positive"),
  currentOccupancy: z.number().int().nonnegative().default(0),
  status: ShelterStatusSchema.default("OPEN"),
  amenities: ShelterAmenitiesSchema.default({
    hasCleanWater: true,
    hasElectricity: true,
    hasGenerator: false,
    hasMedicalFacility: false,
    separateWomenSpace: true,
  }),
  contactPerson: ShelterContactSchema,
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type Shelter = z.infer<typeof ShelterSchema>;

export const CreateShelterDTO = ShelterSchema.omit({ _id: true, createdAt: true, updatedAt: true });
export type CreateShelterDTO = z.infer<typeof CreateShelterDTO>;

export const UpdateShelterDTO = ShelterSchema.partial().omit({ _id: true });
export type UpdateShelterDTO = z.infer<typeof UpdateShelterDTO>;

export const NearbyShelterQueryDTO = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  maxDistance: z.coerce.number().positive().default(10000), // meters
  minCapacity: z.coerce.number().nonnegative().optional(),
  district: z.string().optional(),
});
export type NearbyShelterQueryDTO = z.infer<typeof NearbyShelterQueryDTO>;

// ==========================================
// 4. Evacuation Route DTOs & Schemas
// ==========================================
export const EvacuationRouteQueryDTO = z.object({
  fromLat: z.coerce.number().min(-90).max(90),
  fromLng: z.coerce.number().min(-180).max(180),
  shelterId: z.string().optional(),
});
export type EvacuationRouteQueryDTO = z.infer<typeof EvacuationRouteQueryDTO>;

export interface RouteStepInstruction {
  distanceMeters: number;
  durationSeconds: number;
  instruction: string;
  name: string;
}

export interface EvacuationRouteResponse {
  routeType: "road" | "fallback";
  destinationShelter: Shelter;
  distanceMeters: number;
  durationMinutes: number;
  geometry: GeoJSONLineString;
  steps: RouteStepInstruction[];
  warnings?: string[];
}

// ==========================================
// 5. Relief Requests Collection
// ==========================================
export const RequestUrgencySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type RequestUrgency = z.infer<typeof RequestUrgencySchema>;

export const RequestCategorySchema = z.enum(["FOOD", "WATER", "MEDICAL", "SHELTER_RESCUE", "CLOTHING", "OTHER"]);
export type RequestCategory = z.infer<typeof RequestCategorySchema>;

export const RequestStatusSchema = z.enum(["PENDING", "ASSIGNED", "IN_PROGRESS", "FULFILLED", "REJECTED"]);
export type RequestStatus = z.infer<typeof RequestStatusSchema>;

export const ReliefRequestSchema = z.object({
  _id: z.string().optional(),
  requesterId: z.string().optional(),
  requesterName: z.string().min(2, "Name must be at least 2 characters"),
  contactPhone: z.string().regex(/^(\+8801|01)[3-9]\d{8}$/, "Invalid phone number"),
  location: GeoJSONPointSchema,
  addressDetails: z.string().min(3, "Address details must be at least 3 characters"),
  category: RequestCategorySchema,
  urgency: RequestUrgencySchema.default("MEDIUM"),
  peopleCount: z.number().int().positive().default(1),
  description: z.string().min(5, "Description must be at least 5 characters"),
  status: RequestStatusSchema.default("PENDING"),
  assignedVolunteerId: z.string().nullable().optional(),
  assignedShelterId: z.string().nullable().optional(),
  aiPriorityScore: z.number().min(0).max(100).optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type ReliefRequest = z.infer<typeof ReliefRequestSchema>;

export const CreateReliefRequestDTO = ReliefRequestSchema.omit({ _id: true, createdAt: true, updatedAt: true });
export type CreateReliefRequestDTO = z.infer<typeof CreateReliefRequestDTO>;

export const UpdateReliefRequestDTO = ReliefRequestSchema.partial().omit({ _id: true });
export type UpdateReliefRequestDTO = z.infer<typeof UpdateReliefRequestDTO>;

/**
 * Heuristic priority and urgency calculation based on severity keywords and input severity.
 */
export function calculatePriorityScore(
  description: string,
  severityInput: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
): { priorityScore: number; urgency: RequestUrgency } {
  let baseScore = 15;
  if (severityInput === "MEDIUM") baseScore = 45;
  if (severityInput === "HIGH") baseScore = 70;
  if (severityInput === "CRITICAL") baseScore = 90;

  let keywordBonus = 0;
  const descLower = description.toLowerCase();

  const criticalKeywords = ["drown", "trap", "injured", "bleed", "heart", "die", "infant", "pregnant", "submerged"];
  const highKeywords = ["hungry", "starving", "thirst", "dehydrated", "medicine", "sick", "elderly", "collapsing"];

  for (const kw of criticalKeywords) {
    if (descLower.includes(kw)) {
      keywordBonus += 15;
      break;
    }
  }

  for (const kw of highKeywords) {
    if (descLower.includes(kw)) {
      keywordBonus += 10;
      break;
    }
  }

  const priorityScore = Math.max(0, Math.min(100, baseScore + keywordBonus));

  let urgency: RequestUrgency = "LOW";
  if (priorityScore >= 85) urgency = "CRITICAL";
  else if (priorityScore >= 70) urgency = "HIGH";
  else if (priorityScore >= 45) urgency = "MEDIUM";

  return { priorityScore, urgency };
}

// ==========================================
// 6. Resources Collection
// ==========================================
export const ResourceCategorySchema = z.enum(["DRY_FOOD", "DRINKING_WATER", "MEDICINE", "ORAL_SALINE", "BLANKETS", "HYGIENE_KITS"]);
export type ResourceCategory = z.infer<typeof ResourceCategorySchema>;

export const ResourceSchema = z.object({
  _id: z.string().optional(),
  shelterId: z.string().min(1, "Shelter ID is required"),
  category: ResourceCategorySchema,
  itemName: z.string().min(2, "Item name must be at least 2 characters"),
  totalQuantity: z.number().nonnegative(),
  allocatedQuantity: z.number().nonnegative().default(0),
  unit: z.string().min(1, "Unit is required"),
  lastRestockedAt: z.date().default(() => new Date()),
  updatedBy: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type Resource = z.infer<typeof ResourceSchema>;

export const CreateResourceDTO = ResourceSchema.omit({ _id: true, createdAt: true, updatedAt: true });
export type CreateResourceDTO = z.infer<typeof CreateResourceDTO>;

export const UpdateResourceDTO = ResourceSchema.partial().omit({ _id: true });
export type UpdateResourceDTO = z.infer<typeof UpdateResourceDTO>;

// ==========================================
// 7. Reports Collection
// ==========================================
export const ReportStatusSchema = z.enum(["UNVERIFIED", "VERIFIED", "DISCARDED"]);
export type ReportStatus = z.infer<typeof ReportStatusSchema>;

export const ReportSchema = z.object({
  _id: z.string().optional(),
  reporterId: z.string().optional(),
  reporterName: z.string(),
  reporterPhone: z.string(),
  location: GeoJSONPointSchema,
  waterLevelInches: z.number().optional(),
  hazardDescription: z.string(),
  photoUrls: z.array(z.string()).default([]),
  status: ReportStatusSchema.default("UNVERIFIED"),
  verifiedBy: z.string().nullable().optional(),
  createdAt: z.date().default(() => new Date()),
});
export type Report = z.infer<typeof ReportSchema>;

// ==========================================
// 8. Notifications Collection
// ==========================================
export const NotificationChannelSchema = z.enum(["IN_APP", "SMS", "WEBSOCKET_BROADCAST"]);
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;

export const NotificationSchema = z.object({
  _id: z.string().optional(),
  recipientUserId: z.string().nullable().optional(),
  targetDistrict: z.string().optional(),
  title: z.string(),
  message: z.string(),
  channel: NotificationChannelSchema,
  isRead: z.boolean().default(false),
  sentAt: z.date().default(() => new Date()),
});
export type Notification = z.infer<typeof NotificationSchema>;

// ==========================================
// API Envelope Schema
// ==========================================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
