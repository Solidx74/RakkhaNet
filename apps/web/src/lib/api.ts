import type {
  Shelter,
  RiskZone,
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
