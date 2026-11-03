import "dotenv/config";
import type { RiskZoneComputeInput } from "@rakkhanet/shared-types";

/**
 * Creates the demo risk zones THROUGH THE REAL API, so each one is scored by
 * the AI service exactly as a zone made in the admin form would be (with the
 * rule-based fallback if the AI service is down or an input is out of range).
 *
 * Why not insert them straight into MongoDB like db/seed.ts does? Because the
 * AI score is only computed inside POST /api/risk-zones -- a zone written
 * directly to the database has no `scoredBy`, no `confidence`, and a level
 * from the rule-based formula.
 *
 * Before running:
 *   1. The API (and the AI service, to get AI scores) must be running.
 *   2. The existing zones must be deleted first (NoSQLBooster:
 *      db.risk_zones.deleteMany({})). This script refuses to run while any
 *      zone exists, so it can never create duplicates.
 *   3. Provide an ADMIN account's credentials:
 *        SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD   (environment variables)
 *
 *   npm run seed:risk-zones --workspace=api
 */

const API_URL =
  process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 8080}`;
// Sent on the sign-in request: Better Auth only accepts requests from its
// trusted origins, and this is the web app's.
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:3000";

/** Approximate district centres as [lng, lat] -- same values as db/seed.ts. */
const DISTRICTS = {
  chattogram: [91.7832, 22.3569],
  feni: [91.4372, 22.8494],
  cumilla: [91.1809, 23.4607],
  noakhali: [91.0989, 22.8236],
  coxsbazar: [92.0058, 21.4272],
  sylhet: [91.8687, 24.8949],
  sirajganj: [89.7006, 24.4533],
  bogura: [89.3773, 24.8465],
  rangpur: [89.2752, 25.7439],
  gaibandha: [89.5285, 25.3288],
  barguna: [90.1121, 22.0953],
  patuakhali: [90.3296, 22.3596],
} as const satisfies Record<string, readonly [number, number]>;

/** A closed square ring around a centre, GeoJSON order [lng, lat]. */
function squarePolygon(
  centerLng: number,
  centerLat: number,
  delta = 0.04,
): [number, number][][] {
  return [
    [
      [centerLng - delta, centerLat - delta],
      [centerLng + delta, centerLat - delta],
      [centerLng + delta, centerLat + delta],
      [centerLng - delta, centerLat + delta],
      [centerLng - delta, centerLat - delta],
    ],
  ];
}

// Inputs spread across the risk bands -- illustrative values, not real
// meteorological readings. All sit inside the AI model's accepted range
// (rainfall 0-350 mm, river level 0-12 m, elevation 0-25 m), so every zone
// is eligible for AI scoring.
const ZONES: {
  region: string;
  district: keyof typeof DISTRICTS;
  hazardType: RiskZoneComputeInput["hazardType"];
  inputs: RiskZoneComputeInput["inputs"];
}[] = [
  {
    region: "Sirajganj (Jamuna basin)",
    district: "sirajganj",
    hazardType: "flood",
    inputs: { rainfallMm: 210, riverLevelM: 8.5, elevationM: 2 },
  },
  {
    region: "Gaibandha (Brahmaputra basin)",
    district: "gaibandha",
    hazardType: "flood",
    inputs: { rainfallMm: 195, riverLevelM: 7.8, elevationM: 3 },
  },
  {
    region: "Bogura",
    district: "bogura",
    hazardType: "flood",
    inputs: { rainfallMm: 140, riverLevelM: 6.2, elevationM: 5 },
  },
  {
    region: "Sylhet (haor area)",
    district: "sylhet",
    hazardType: "flood",
    inputs: { rainfallMm: 160, riverLevelM: 5.5, elevationM: 4 },
  },
  {
    region: "Sonagazi, Feni",
    district: "feni",
    hazardType: "flood",
    inputs: { rainfallMm: 130, riverLevelM: 5.0, elevationM: 6 },
  },
  {
    region: "Cumilla",
    district: "cumilla",
    hazardType: "flood",
    inputs: { rainfallMm: 95, riverLevelM: 3.8, elevationM: 8 },
  },
  {
    region: "Noakhali",
    district: "noakhali",
    hazardType: "flood",
    inputs: { rainfallMm: 100, riverLevelM: 4.2, elevationM: 7 },
  },
  {
    region: "Chattogram Metro",
    district: "chattogram",
    hazardType: "flood",
    inputs: { rainfallMm: 110, riverLevelM: 3.0, elevationM: 9 },
  },
  {
    region: "Cox's Bazar Coast",
    district: "coxsbazar",
    hazardType: "cyclone",
    inputs: { rainfallMm: 90, riverLevelM: 2.0, elevationM: 10 },
  },
  {
    region: "Barguna Coast",
    district: "barguna",
    hazardType: "cyclone",
    inputs: { rainfallMm: 85, riverLevelM: 1.8, elevationM: 11 },
  },
  {
    region: "Patuakhali Coast",
    district: "patuakhali",
    hazardType: "cyclone",
    inputs: { rainfallMm: 70, riverLevelM: 1.5, elevationM: 12 },
  },
  {
    region: "Rangpur",
    district: "rangpur",
    hazardType: "flood",
    inputs: { rainfallMm: 30, riverLevelM: 0.8, elevationM: 18 },
  },
];

/** The request bodies, exactly what POST /api/risk-zones accepts. */
export function buildPayloads(): RiskZoneComputeInput[] {
  return ZONES.map((z) => {
    const [lng, lat] = DISTRICTS[z.district];
    return {
      region: z.region,
      hazardType: z.hazardType,
      geometry: { type: "Polygon", coordinates: squarePolygon(lng, lat) },
      inputs: z.inputs,
    };
  });
}

interface CreatedZone {
  region: string;
  riskLevel: string;
  riskScore: number;
  scoredBy?: "ai" | "rule";
  confidence?: number;
}

async function bodyText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return "";
  }
}

/** Signs in and returns a Cookie header value for later requests. */
async function signIn(email: string, password: string): Promise<string> {
  const res = await fetch(`${API_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: WEB_ORIGIN },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(
      `Sign-in failed (${res.status}). Check SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD. ${await bodyText(res)}`,
    );
  }
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  if (!cookie) throw new Error("Signed in, but no session cookie came back.");
  return cookie;
}

export async function main(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (an ADMIN account) first.",
    );
  }

  console.log(`[seed-risk-zones] API: ${API_URL}`);

  // 1. Never create duplicates: refuse if any zone is already there.
  const existingRes = await fetch(`${API_URL}/api/risk-zones`).catch(() => {
    throw new Error(`Can't reach the API at ${API_URL}. Is it running?`);
  });
  if (!existingRes.ok) {
    throw new Error(`GET /api/risk-zones failed (${existingRes.status}).`);
  }
  const existing = ((await existingRes.json()) as { riskZones?: unknown[] })
    .riskZones;
  if (existing && existing.length > 0) {
    throw new Error(
      `${existing.length} risk zone(s) already exist. Delete them first in NoSQLBooster ` +
        `(db.risk_zones.deleteMany({})), then run this again. Nothing was created.`,
    );
  }

  // 2. Sign in and make sure it really is an admin, before creating anything.
  const cookie = await signIn(email, password);
  const meRes = await fetch(`${API_URL}/api/me`, {
    headers: { Cookie: cookie },
  });
  if (!meRes.ok) throw new Error(`GET /api/me failed (${meRes.status}).`);
  const me = (await meRes.json()) as {
    user?: { email?: string; role?: string };
  };
  if (me.user?.role !== "admin") {
    throw new Error(
      `${me.user?.email ?? email} has role "${me.user?.role}", not "admin". ` +
        `Promote it first: npm run set-role --workspace=api -- ${email} admin ` +
        `(then use that account).`,
    );
  }
  console.log(`[seed-risk-zones] signed in as ${me.user.email} (admin)\n`);

  // 3. Create the zones one by one through the real route.
  const created: CreatedZone[] = [];
  for (const payload of buildPayloads()) {
    const res = await fetch(`${API_URL}/api/risk-zones`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(payload),
    });
    if (res.status !== 201) {
      throw new Error(
        `Creating "${payload.region}" failed (${res.status}): ${await bodyText(res)}\n` +
          `${created.length} of ${ZONES.length} zones were created before this. ` +
          `Delete them (db.risk_zones.deleteMany({})) before trying again.`,
      );
    }
    const zone = (await res.json()) as CreatedZone;
    created.push(zone);
    const how =
      zone.scoredBy === "ai"
        ? `AI ${Math.round((zone.confidence ?? 0) * 100)}%`
        : "rule-based";
    console.log(
      `  ${zone.region.padEnd(34)} ${String(zone.riskLevel).padEnd(7)} ${how}`,
    );
  }

  const aiCount = created.filter((z) => z.scoredBy === "ai").length;
  console.log(
    `\n[seed-risk-zones] created ${created.length} zones: ${aiCount} AI-scored, ${created.length - aiCount} rule-based.`,
  );
  if (aiCount < created.length) {
    console.warn(
      "[seed-risk-zones] Some zones fell back to the rule. Is the AI service running " +
        "(and reachable from the API at AI_SERVICE_URL)? The API console shows the reason.\n" +
        "To redo them: delete the zones in NoSQLBooster, start the AI service, run this again.",
    );
    process.exitCode = 2;
  }
}

// Run only when started directly (not when imported by the tests).
if (process.argv[1] && /seedRiskZones\.[cm]?[jt]s$/.test(process.argv[1])) {
  main().catch((err) => {
    console.error(
      `[seed-risk-zones] ${err instanceof Error ? err.message : err}`,
    );
    process.exitCode = 1;
  });
}
