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
// 2. Risk Zones Collection
// ==========================================
export const RiskLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const DisasterTypeSchema = z.enum(["FLOOD", "CYCLONE", "LANDSLIDE", "STORM_SURGE"]);
export type DisasterType = z.infer<typeof DisasterTypeSchema>;

export const RiskZoneSchema = z.object({
  _id: z.string().optional(),
  title: z.string(),
  disasterType: DisasterTypeSchema,
  riskLevel: RiskLevelSchema,
  geometry: GeoJSONPolygonSchema,
  riverWaterLevelMeters: z.number().optional(),
  warningLevel: z.string().optional(),
  affectedPopEstimate: z.number().default(0),
  isActive: z.boolean().default(true),
  updatedBy: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type RiskZone = z.infer<typeof RiskZoneSchema>;

// ==========================================
// 3. Shelters Collection
// ==========================================
export const ShelterStatusSchema = z.enum(["OPEN", "FULL", "CLOSED", "INACCESSIBLE"]);
export type ShelterStatus = z.infer<typeof ShelterStatusSchema>;

export const ShelterSchema = z.object({
  _id: z.string().optional(),
  name: z.string(),
  code: z.string().optional(),
  location: GeoJSONPointSchema,
  address: z.string(),
  division: z.string(),
  district: z.string(),
  upazila: z.string(),
  capacity: z.number().int().positive(),
  currentOccupancy: z.number().int().nonnegative().default(0),
  status: ShelterStatusSchema.default("OPEN"),
  amenities: z.object({
    hasCleanWater: z.boolean().default(true),
    hasElectricity: z.boolean().default(true),
    hasGenerator: z.boolean().default(false),
    hasMedicalFacility: z.boolean().default(false),
    separateWomenSpace: z.boolean().default(true),
  }).default({
    hasCleanWater: true,
    hasElectricity: true,
    hasGenerator: false,
    hasMedicalFacility: false,
    separateWomenSpace: true,
  }),
  contactPerson: z.object({
    name: z.string(),
    phone: z.string(),
  }),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type Shelter = z.infer<typeof ShelterSchema>;

// ==========================================
// 4. Relief Requests Collection
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
  requesterName: z.string(),
  contactPhone: z.string(),
  location: GeoJSONPointSchema,
  addressDetails: z.string(),
  category: RequestCategorySchema,
  urgency: RequestUrgencySchema.default("MEDIUM"),
  peopleCount: z.number().int().positive().default(1),
  description: z.string(),
  status: RequestStatusSchema.default("PENDING"),
  assignedVolunteerId: z.string().nullable().optional(),
  assignedShelterId: z.string().nullable().optional(),
  aiPriorityScore: z.number().min(0).max(100).optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type ReliefRequest = z.infer<typeof ReliefRequestSchema>;

// ==========================================
// 5. Resources Collection
// ==========================================
export const ResourceCategorySchema = z.enum(["DRY_FOOD", "DRINKING_WATER", "MEDICINE", "ORAL_SALINE", "BLANKETS", "HYGIENE_KITS"]);
export type ResourceCategory = z.infer<typeof ResourceCategorySchema>;

export const ResourceSchema = z.object({
  _id: z.string().optional(),
  shelterId: z.string(),
  category: ResourceCategorySchema,
  itemName: z.string(),
  totalQuantity: z.number().nonnegative(),
  allocatedQuantity: z.number().nonnegative().default(0),
  unit: z.string(),
  lastRestockedAt: z.date().default(() => new Date()),
  updatedBy: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type Resource = z.infer<typeof ResourceSchema>;

// ==========================================
// 6. Reports Collection (Crowdsourced)
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
// 7. Notifications Collection
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
