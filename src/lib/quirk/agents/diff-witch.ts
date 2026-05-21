import {
  scoreText,
  scoreDelta,
  SCORE_KEYS,
  type QuirkScores,
} from "../scoring";
import type { DiffResult } from "./types";

/**
 * Diff Witch — compares two versions and explains what changed in meaning,
 * tone, usefulness, and persona, not just which characters moved.
 */
export function diffWitchCompare(input: {
  fromText: string | null;
  toText: string | null;
}): DiffResult {
  const fromText = input.fromText ?? "";
  const toText = input.toText ?? "";

  const fromLines = new Set(splitLines(fromText));
  const toLines = splitLines(toText);
  const fromLineSet = fromLines;

  const additions = toLines.filter((l) => !fromLineSet.has(l)).slice(0, 25);
  const removals = [...fromLines]
    .filter((l) => !new Set(toLines).has(l))
    .slice(0, 25);

  const fromScores = scoreText(fromText);
  const toScores = scoreText(toText);
  const delta = scoreDelta(fromScores, toScores);

  const meaningShift = buildMeaningShift(fromScores, toScores, delta);
  const summary = buildSummary(delta);

  return { summary, additions, removals, meaningShift, scoreDelta: delta };
}

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function buildMeaningShift(
  from: QuirkScores,
  to: QuirkScores,
  delta: Record<keyof QuirkScores, number>,
): Record<string, unknown> {
  return {
    toneDrift: describe(delta.funny, "funnier", "more serious"),
    personaDrift: describe(
      delta.commercial,
      "more commercial",
      "more personal",
    ),
    hookDrift: describe(delta.hookDensity, "stronger hook", "softer hook"),
    emotionDrift: describe(delta.emotionalCharge, "more charged", "more flat"),
    from,
    to,
  };
}

function describe(delta: number, up: string, down: string): string {
  if (delta > 0.05) return `${up} (+${delta})`;
  if (delta < -0.05) return `${down} (${delta})`;
  return "roughly unchanged";
}

function buildSummary(delta: Record<keyof QuirkScores, number>): string {
  const moves = SCORE_KEYS.filter((k) => k !== "quality")
    .map((k) => ({ k, d: delta[k] }))
    .filter((m) => Math.abs(m.d) >= 0.05)
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
    .slice(0, 3);

  if (moves.length === 0)
    return "No meaningful semantic shift between versions.";

  const phrases = moves.map((m) => {
    const dir = m.d > 0 ? "gained" : "lost";
    return `${dir} ${humanize(m.k)} (${m.d > 0 ? "+" : ""}${m.d})`;
  });
  return `This version ${joinList(phrases)}.`;
}

function joinList(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function humanize(key: keyof QuirkScores): string {
  return key.replace(/([A-Z])/g, " $1").toLowerCase();
}
