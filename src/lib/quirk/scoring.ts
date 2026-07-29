import { contentWords, tokenize } from "./text";

/**
 * The shared "creative vitals" every Quirk surface speaks in. Annotations,
 * semantic diffs, and experiment runs all report against the same axes so the
 * numbers stay comparable across the whole pipeline.
 */
export type QuirkScores = {
  hookDensity: number;
  commercial: number;
  funny: number;
  weirdness: number;
  emotionalCharge: number;
  spawnPotential: number;
  quality: number;
};

export const SCORE_KEYS: (keyof QuirkScores)[] = [
  "hookDensity",
  "commercial",
  "funny",
  "weirdness",
  "emotionalCharge",
  "spawnPotential",
  "quality",
];

const COMMERCIAL_WORDS = new Set([
  "buy",
  "sell",
  "price",
  "free",
  "deal",
  "offer",
  "launch",
  "product",
  "brand",
  "customer",
  "market",
  "sale",
  "subscribe",
  "premium",
  "value",
  "save",
  "money",
  "revenue",
  "growth",
  "convert",
  "upgrade",
]);

const FUNNY_WORDS = new Set([
  "lol",
  "haha",
  "joke",
  "funny",
  "absurd",
  "ridiculous",
  "goblin",
  "chaos",
  "weird",
  "banana",
  "nonsense",
  "meme",
  "silly",
  "ironic",
  "gremlin",
]);

const EMOTION_WORDS = new Set([
  "love",
  "hate",
  "fear",
  "rage",
  "joy",
  "grief",
  "hope",
  "ache",
  "crave",
  "dread",
  "thrill",
  "wonder",
  "broken",
  "alive",
  "burn",
  "scream",
  "tender",
  "furious",
  "ecstatic",
  "heartbreak",
]);

const HOOK_OPENERS = [
  "what if",
  "imagine",
  "stop",
  "never",
  "the secret",
  "nobody",
  "why",
  "how to",
  "you won't",
  "here's",
  "the truth",
  "everyone",
];

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function ratio(matches: number, total: number): number {
  if (total <= 0) return 0;
  return matches / total;
}

/** Round to 3 decimals. Exported so score arithmetic stays identical wherever
 * a persisted value is produced or compared. */
export function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Deterministically score a piece of text across the creative vitals. Pure and
 * dependency-free so it is trivially testable and runs without any LLM.
 */
export function scoreText(text: string): QuirkScores {
  const clean = (text ?? "").trim();
  const tokens = tokenize(clean);
  const words = contentWords(clean);
  const total = tokens.length || 1;
  const lower = clean.toLowerCase();

  const sentences = clean
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const avgSentenceLen = sentences.length
    ? tokens.length / sentences.length
    : tokens.length;

  const hookOpenerHits = HOOK_OPENERS.filter((h) => lower.includes(h)).length;
  const questionHits = (clean.match(/\?/g) ?? []).length;
  const shortPunch = avgSentenceLen > 0 && avgSentenceLen <= 12 ? 0.3 : 0;
  const hookDensity = clamp01(
    hookOpenerHits * 0.25 +
      ratio(questionHits, sentences.length || 1) * 0.4 +
      shortPunch,
  );

  const commercial = clamp01(
    ratio(tokens.filter((w) => COMMERCIAL_WORDS.has(w)).length, total) * 6,
  );

  const funny = clamp01(
    ratio(tokens.filter((w) => FUNNY_WORDS.has(w)).length, total) * 8 +
      ratio((clean.match(/!/g) ?? []).length, sentences.length || 1) * 0.15,
  );

  const emotionalCharge = clamp01(
    ratio(tokens.filter((w) => EMOTION_WORDS.has(w)).length, total) * 7 +
      ratio((clean.match(/!/g) ?? []).length, sentences.length || 1) * 0.2,
  );

  const uniqueRatio = ratio(new Set(words).size, words.length || 1);
  const weirdness = clamp01(uniqueRatio * 0.7 + funny * 0.3);

  const lengthSignal = clamp01(tokens.length / 120);
  const spawnPotential = clamp01(
    lengthSignal * 0.4 + uniqueRatio * 0.3 + hookDensity * 0.3,
  );

  const quality = clamp01(
    hookDensity * 0.25 +
      emotionalCharge * 0.2 +
      spawnPotential * 0.25 +
      uniqueRatio * 0.15 +
      commercial * 0.15,
  );

  return {
    hookDensity: round3(hookDensity),
    commercial: round3(commercial),
    funny: round3(funny),
    weirdness: round3(weirdness),
    emotionalCharge: round3(emotionalCharge),
    spawnPotential: round3(spawnPotential),
    quality: round3(quality),
  };
}

/** Per-axis delta between two score sets (to − from). */
export function scoreDelta(
  from: QuirkScores,
  to: QuirkScores,
): Record<keyof QuirkScores, number> {
  const out = {} as Record<keyof QuirkScores, number>;
  for (const key of SCORE_KEYS) {
    out[key] = round3(to[key] - from[key]);
  }
  return out;
}

/** Collapse the vitals into a single 0..1 headline number. */
export function overallScore(scores: QuirkScores): number {
  return scores.quality;
}
