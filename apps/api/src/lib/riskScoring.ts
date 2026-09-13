import type { RiskLevel } from "@rakkhanet/shared-types";

/**
 * v1 risk scorer -- a simple, fully-explainable weighted rule, not a trained
 * model. That's intentional: this is what gets replaced by the AI
 * microservice in Phase 3, and having an honest, transparent baseline to
 * compare it against is more defensible than skipping straight to a black
 * box. Every weight below is a judgment call, not a derived constant --
 * revisit them once real data is available.
 */
export function computeRiskScore(inputs: {
  rainfallMm?: number;
  riverLevelM?: number;
  elevationM?: number;
}): { riskScore: number; riskLevel: RiskLevel } {
  let score = 0;

  if (inputs.rainfallMm !== undefined) {
    score += Math.min(inputs.rainfallMm / 3, 40);
  }
  if (inputs.riverLevelM !== undefined) {
    score += Math.min(inputs.riverLevelM * 5, 40);
  }
  if (inputs.elevationM !== undefined) {
    score += Math.max(0, 20 - inputs.elevationM * 2);
  }

  const riskScore = Math.min(100, Math.round(score));

  let riskLevel: RiskLevel;
  if (riskScore >= 75) riskLevel = "severe";
  else if (riskScore >= 50) riskLevel = "high";
  else if (riskScore >= 25) riskLevel = "medium";
  else riskLevel = "low";

  return { riskScore, riskLevel };
}
