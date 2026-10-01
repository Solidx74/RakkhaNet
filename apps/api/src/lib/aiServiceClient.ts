import { fromNodeHeaders } from "better-auth/node";
import type { IncomingHttpHeaders } from "node:http";
import type { RiskLevel } from "@rakkhanet/shared-types";
import type { Auth } from "../auth.js";
import { computeRiskScore } from "./riskScoring.js";

/**
 * Mints a short-lived JWT via Better Auth's JWT plugin, for calling the
 * AI service (Express -> FastAPI). The token is signed with Better Auth's
 * key (EdDSA by default) and verified by the AI service against the JWKS.
 *
 * The `auth` instance is passed in rather than imported, because it is
 * created by `createAuth(db, client)` after the Mongo connection is awaited
 * (see index.ts), so there is no module-level instance to import.
 *
 * Throws if no token can be minted, so callers can fall back to the v1 rule.
 */
export async function mintServiceToken(
  auth: Auth,
  headers: IncomingHttpHeaders,
): Promise<string> {
  const result = await auth.api.getToken({
    headers: fromNodeHeaders(headers),
  });

  const token = result?.token;
  if (!token) {
    throw new Error(
      "Failed to mint service JWT: Better Auth returned no token",
    );
  }

  return token;
}

/** Request body for the AI service's POST /predict/risk (see apps/ai/main.py). */
export interface RiskPredictionInput {
  rainfall_mm: number; // 0-350
  river_level_m: number; // 0-12
  elevation_m: number; // 0-25
}

/**
 * Response from POST /predict/risk -- matches the return value of
 * predict_risk_level() in apps/ai/predictor.py. Note the camelCase keys
 * (riskLevel), unlike the snake_case request fields.
 */
export interface RiskPredictionResult {
  riskLevel: string;
  confidence: number; // probability of the predicted class, 0-1
  probabilities: Record<string, number>; // one entry per class, sums to ~1
}

// How long to wait for the AI service before giving up. Kept short on
// purpose: the caller falls back to the v1 rule on failure, and a hung AI
// service should not make creating a risk zone hang with it.
const AI_REQUEST_TIMEOUT_MS = 3000;

/**
 * Raw call to the AI service's POST /predict/risk. Takes an already-minted
 * token, returns the parsed result, or throws on any failure (network error,
 * timeout, non-2xx such as 401 or a 422 for out-of-range inputs, malformed
 * body). It deliberately does NOT fall back -- that is getRiskAssessment()'s
 * job.
 */
export async function callPredictRisk(
  token: string,
  input: RiskPredictionInput,
): Promise<RiskPredictionResult> {
  const aiUrl = process.env.AI_SERVICE_URL ?? "http://localhost:8001";

  const res = await fetch(`${aiUrl}/predict/risk`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(
      `AI service /predict/risk failed with status ${res.status}`,
    );
  }

  return (await res.json()) as RiskPredictionResult;
}

// The levels the rest of the app understands. The AI service returns a plain
// string, so it is checked against this list before being trusted -- if the
// model's class names ever drift from these, we fall back instead of storing
// a level the Risk Map doesn't know how to render.
const RISK_LEVELS: readonly RiskLevel[] = ["low", "medium", "high", "severe"];

function isRiskLevel(value: unknown): value is RiskLevel {
  return RISK_LEVELS.includes(value as RiskLevel);
}

/** Same input shape computeRiskScore() already takes (all fields optional). */
export type RiskInputs = Parameters<typeof computeRiskScore>[0];

/**
 * Normalized result, identical in shape whichever path produced it, so
 * callers never need to care how the level was computed -- only `source`
 * says which path it was.
 *
 * NOTE: `riskScore` is ALWAYS the v1 rule's 0-100 index, even when `source`
 * is "ai", because the AI model predicts a class, not a score. So with
 * source "ai", riskLevel (AI) and riskScore (rule) can disagree slightly.
 */
export interface RiskAssessment {
  riskScore: number;
  riskLevel: RiskLevel;
  source: "ai" | "rule";
  /** Only set when source is "ai": probability of the predicted class, 0-1. */
  confidence?: number;
  /** Only set when source is "ai": probability per class. */
  probabilities?: Record<string, number>;
}

/**
 * Tries the AI service first; on ANY failure (missing inputs, token error,
 * network error, timeout, non-2xx, unexpected response) falls back to the
 * v1 rule and logs why. It never throws because of the AI service, so a
 * down AI service can't break risk-zone creation ("degrade, don't break").
 */
export async function getRiskAssessment(
  auth: Auth,
  headers: IncomingHttpHeaders,
  inputs: RiskInputs,
): Promise<RiskAssessment> {
  // Cheap, local and synchronous -- always computed, so the fallback is
  // ready and riskScore is always available.
  const rule = computeRiskScore(inputs);
  const fallback: RiskAssessment = { ...rule, source: "rule" };

  const { rainfallMm, riverLevelM, elevationM } = inputs;

  // The AI model needs all three inputs; v1 tolerates missing ones. With a
  // field missing there is nothing to send, so skip the AI call entirely.
  if (
    rainfallMm === undefined ||
    riverLevelM === undefined ||
    elevationM === undefined
  ) {
    return fallback;
  }

  try {
    const token = await mintServiceToken(auth, headers);
    const prediction = await callPredictRisk(token, {
      rainfall_mm: rainfallMm,
      river_level_m: riverLevelM,
      elevation_m: elevationM,
    });

    if (
      !isRiskLevel(prediction.riskLevel) ||
      typeof prediction.confidence !== "number"
    ) {
      throw new Error(
        `AI service returned an unexpected response: ${JSON.stringify(prediction)}`,
      );
    }

    return {
      riskScore: rule.riskScore,
      riskLevel: prediction.riskLevel,
      source: "ai",
      confidence: prediction.confidence,
      probabilities: prediction.probabilities,
    };
  } catch (err) {
    console.warn(
      "[ai] risk prediction failed, falling back to v1 rule:",
      err instanceof Error ? err.message : err,
    );
    return fallback;
  }
}
