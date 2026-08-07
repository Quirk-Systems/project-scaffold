import { round3, type QuirkScores } from "./scoring";

// The Goldilocks gate: heuristics decide whether an asset's score profile
// earns an automatic 1/1 mint. Too cold — nobody would claim it. Too hot —
// chaos is outrunning craft; a human curator should look first. Just right —
// mint it. Manual minting (POST /api/offers) deliberately bypasses this
// gate: heuristics drive, humans overrule.

export type GoldilocksVerdict = "too_cold" | "too_hot" | "just_right";

export type GoldilocksReading = {
  verdict: GoldilocksVerdict;
  // Composite intensity 0..1 — how loud the asset runs.
  heat: number;
  // Human-readable rationale, surfaced in promote responses and logs.
  reasons: string[];
};

const COLD_QUALITY_FLOOR = 0.25;
const COLD_PULSE_FLOOR = 0.15;
const HOT_WEIRDNESS_CEILING = 0.85;
const HOT_QUALITY_LAG = 0.5;
const HOT_CHARGE_CEILING = 0.9;
const HOT_COMMERCIAL_FLOOR = 0.2;

/**
 * Read an asset's temperature. Pure and deterministic — same profile, same
 * porridge. `null` scores (media assets with no text signal) defer to
 * curation and pass as just_right.
 */
export function readGoldilocks(scores: QuirkScores | null): GoldilocksReading {
  if (!scores) {
    return {
      verdict: "just_right",
      heat: 0.5,
      reasons: ["no text signal — gate defers to curation"],
    };
  }

  const heat = round3(
    (scores.weirdness + scores.emotionalCharge + scores.hookDensity) / 3,
  );
  const reasons: string[] = [];

  // Too cold: no substance or no pulse — an offer nobody would claim.
  if (scores.quality < COLD_QUALITY_FLOOR) {
    reasons.push(`quality ${scores.quality} below floor ${COLD_QUALITY_FLOOR}`);
  }
  if (
    scores.hookDensity < COLD_PULSE_FLOOR &&
    scores.emotionalCharge < COLD_PULSE_FLOOR
  ) {
    reasons.push(
      `no pulse: hookDensity ${scores.hookDensity} and emotionalCharge ${scores.emotionalCharge} both below ${COLD_PULSE_FLOOR}`,
    );
  }
  if (reasons.length > 0) {
    return { verdict: "too_cold", heat, reasons };
  }

  // Too hot: intensity outrunning craft — hold for a human curator.
  if (
    scores.weirdness > HOT_WEIRDNESS_CEILING &&
    scores.quality < HOT_QUALITY_LAG
  ) {
    reasons.push(
      `weirdness ${scores.weirdness} outruns quality ${scores.quality}`,
    );
  }
  if (
    scores.emotionalCharge > HOT_CHARGE_CEILING &&
    scores.commercial < HOT_COMMERCIAL_FLOOR
  ) {
    reasons.push(
      `emotionalCharge ${scores.emotionalCharge} with commercial ${scores.commercial} reads as rant energy`,
    );
  }
  if (reasons.length > 0) {
    return { verdict: "too_hot", heat, reasons };
  }

  return {
    verdict: "just_right",
    heat,
    reasons: [`heat ${heat} inside the band — mint it`],
  };
}
