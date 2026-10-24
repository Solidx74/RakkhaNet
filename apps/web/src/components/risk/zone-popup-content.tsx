import type { RiskZone } from "@rakkhanet/shared-types";

/**
 * The text inside a risk zone's map popup. A plain component with no map
 * code in it, so it can be rendered and tested on its own.
 *
 * Zones made before AI scoring existed have no `scoredBy`; they were
 * rule-scored, so anything that isn't explicitly "ai" is shown as rule-based.
 *
 * For an AI-scored zone, `riskScore` is still the rule-based 0-100 index
 * (the model predicts a level, not a score), so it can disagree slightly
 * with the level. It is labelled as the rule-based index rather than shown
 * as if it were what produced the level.
 *
 * The secondary lines use opacity rather than a theme colour: a Leaflet
 * popup is always a light box, even in dark mode, where a "muted" theme
 * colour could be near-invisible on it.
 */
export function ZonePopupContent({ zone }: { zone: RiskZone }) {
  const isAi = zone.scoredBy === "ai";

  return (
    <div className="space-y-1">
      <p className="font-semibold">{zone.region}</p>
      {isAi ? (
        <>
          <p className="text-sm capitalize">
            {zone.hazardType} risk:{" "}
            <strong className="capitalize">{zone.riskLevel}</strong>
          </p>
          <p className="text-xs opacity-70">
            Scored by AI model
            {typeof zone.confidence === "number" &&
              ` (${Math.round(zone.confidence * 100)}% confident)`}
          </p>
          <p className="text-xs opacity-70">
            Rule-based index: {zone.riskScore}/100
          </p>
        </>
      ) : (
        <>
          <p className="text-sm capitalize">
            {zone.hazardType} risk:{" "}
            <strong className="capitalize">{zone.riskLevel}</strong> (
            {zone.riskScore}/100)
          </p>
          <p className="text-xs opacity-70">Scored by rule-based formula</p>
        </>
      )}
    </div>
  );
}
