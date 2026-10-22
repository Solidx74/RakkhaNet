import type {
  Shelter,
  ShelterCreateInput,
  RiskZone,
  RiskZoneComputeInput,
  ReliefRequest,
  ReliefRequestCreateInput,
  Resource,
} from "@rakkhanet/shared-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { credentials: "include" });
  if (!res.ok) {
    throw new Error(`API request failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/** Best effort: the API's message from an error response, or "" if none. */
async function readErrorDetail(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.message === "string") return body.message;
    if (typeof body?.error === "string") return body.error;
  } catch {
    // body wasn't JSON -- fall through
  }
  return "";
}

export async function fetchShelters(): Promise<Shelter[]> {
  const data = await apiFetch<{ shelters: Shelter[] }>("/api/shelters");
  return data.shelters;
}

export async function fetchRiskZones(): Promise<RiskZone[]> {
  const data = await apiFetch<{ riskZones: RiskZone[] }>("/api/risk-zones");
  return data.riskZones;
}

export async function fetchNearbyShelters(
  lat: number,
  lng: number,
  radiusKm = 20,
): Promise<Shelter[]> {
  const data = await apiFetch<{ shelters: Shelter[] }>(
    `/api/shelters/nearby?lat=${lat}&lng=${lng}&radius=${radiusKm}`,
  );
  return data.shelters;
}

export async function fetchMyRequests(): Promise<ReliefRequest[]> {
  const data = await apiFetch<{ requests: ReliefRequest[] }>(
    "/api/relief-requests?mine=true",
  );
  return data.requests;
}

// The API derives requesterId from the session, so the client never sends
// it -- this type reflects that instead of hand-redefining the shape.
export type SubmitReliefRequestInput = Omit<
  ReliefRequestCreateInput,
  "requesterId"
>;

export async function submitReliefRequest(
  input: SubmitReliefRequestInput,
): Promise<ReliefRequest> {
  const res = await fetch(`${API_URL}/api/relief-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to submit request");
  const data = await res.json();
  return data.request;
}

export async function fetchAllReliefRequests(): Promise<ReliefRequest[]> {
  // No ?mine=true -- returns everything the caller's role is allowed to see
  // (operational roles get the full pool; see reliefRequests.ts).
  const data = await apiFetch<{ requests: ReliefRequest[] }>(
    "/api/relief-requests",
  );
  return data.requests;
}

export async function assignReliefRequest(
  requestId: string,
  volunteerId: string,
): Promise<ReliefRequest> {
  const res = await fetch(
    `${API_URL}/api/relief-requests/${requestId}/assign`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ volunteerId }),
    },
  );
  if (!res.ok) throw new Error("Failed to assign request");
  return (await res.json()).request;
}

export async function updateReliefRequestStatus(
  requestId: string,
  status: ReliefRequest["status"],
): Promise<ReliefRequest> {
  const res = await fetch(
    `${API_URL}/api/relief-requests/${requestId}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status }),
    },
  );
  if (!res.ok) throw new Error("Failed to update status");
  return (await res.json()).request;
}

export async function fetchResources(): Promise<Resource[]> {
  const data = await apiFetch<{ resources: Resource[] }>("/api/resources");
  return data.resources;
}

export async function updateResourceQuantity(
  resourceId: string,
  quantity: number,
): Promise<Resource> {
  const res = await fetch(`${API_URL}/api/resources/${resourceId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ quantity }),
  });
  if (!res.ok) throw new Error("Failed to update resource");
  return (await res.json()).resource;
}

/**
 * What POST /api/risk-zones returns (the document itself, not wrapped).
 * scoredBy/confidence/probabilities are written by the API since 4b-6 but
 * are not on the shared RiskZone type yet (that's a 4d change), so they are
 * declared here. Picks only the fields the admin form shows -- RiskZone's
 * lastUpdated is typed as Date, which JSON doesn't actually deliver.
 */
export type CreatedRiskZone = Pick<
  RiskZone,
  "_id" | "region" | "hazardType" | "riskLevel" | "riskScore"
> & {
  scoredBy: "ai" | "rule";
  /** Only present when scoredBy is "ai". */
  confidence?: number;
  /** Only present when scoredBy is "ai". */
  probabilities?: Record<string, number>;
};

export async function createRiskZone(
  input: RiskZoneComputeInput,
): Promise<CreatedRiskZone> {
  const res = await fetch(`${API_URL}/api/risk-zones`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(
      `Failed to create risk zone (${res.status})${detail ? `: ${detail}` : ""}`,
    );
  }

  return res.json();
}

/**
 * What POST /api/shelters returns (the document itself, not wrapped). Picks
 * only the fields the admin form shows -- Shelter's createdAt/updatedAt are
 * typed as Date, which JSON doesn't actually deliver.
 */
export type CreatedShelter = Pick<
  Shelter,
  "_id" | "name" | "address" | "capacity" | "currentOccupancy" | "status"
>;

export async function createShelter(
  input: ShelterCreateInput,
): Promise<CreatedShelter> {
  const res = await fetch(`${API_URL}/api/shelters`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(
      `Failed to create shelter (${res.status})${detail ? `: ${detail}` : ""}`,
    );
  }

  return res.json();
}

export type AdminUserRole = "citizen" | "volunteer" | "coordinator" | "admin";

/** One row from GET /api/admin/users (admin-only; see adminUsers.ts). */
export interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  role: AdminUserRole;
  /** ISO string over JSON, or null if the user document has no createdAt. */
  createdAt: string | null;
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const data = await apiFetch<{ users: AdminUser[] }>("/api/admin/users");
  return data.users;
}

export async function updateUserRole(
  userId: string,
  role: AdminUserRole,
): Promise<AdminUser> {
  const res = await fetch(
    `${API_URL}/api/admin/users/${encodeURIComponent(userId)}/role`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ role }),
    },
  );

  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(
      `Failed to change role (${res.status})${detail ? `: ${detail}` : ""}`,
    );
  }

  return (await res.json()).user;
}

/** A volunteer a coordinator/admin can assign. Id + name only, no email. */
export interface AssignableVolunteer {
  id: string;
  name: string;
}

/** Coordinator/admin only -- a volunteer calling this gets a 403. */
export async function fetchAssignableVolunteers(): Promise<
  AssignableVolunteer[]
> {
  const data = await apiFetch<{ volunteers: AssignableVolunteer[] }>(
    "/api/relief-requests/volunteers",
  );
  return data.volunteers;
}
