import { describe, it, expect } from "vitest";
import {
  scoreText,
  scoreDelta,
  overallScore,
  SCORE_KEYS,
} from "@/lib/quirk/scoring";

describe("scoreText", () => {
  it("returns all score axes in the 0..1 range", () => {
    const scores = scoreText("What if you could sell this weird funny idea?");
    for (const key of SCORE_KEYS) {
      expect(scores[key]).toBeGreaterThanOrEqual(0);
      expect(scores[key]).toBeLessThanOrEqual(1);
    }
  });

  it("rates commercial copy higher on the commercial axis", () => {
    const commercial = scoreText(
      "Buy now and save money. This product is a great deal — premium value, free upgrade.",
    );
    const plain = scoreText("The cat sat quietly by the window all afternoon.");
    expect(commercial.commercial).toBeGreaterThan(plain.commercial);
  });

  it("detects stronger hooks from opener phrases and questions", () => {
    const hooky = scoreText("What if nobody told you the truth? Here's why.");
    const flat = scoreText("This is a regular sentence with no hook at all.");
    expect(hooky.hookDensity).toBeGreaterThan(flat.hookDensity);
  });

  it("is deterministic", () => {
    const a = scoreText("goblin chaos banana");
    const b = scoreText("goblin chaos banana");
    expect(a).toEqual(b);
  });

  it("handles empty text without throwing", () => {
    const scores = scoreText("");
    expect(overallScore(scores)).toBe(scores.quality);
  });
});

describe("scoreDelta", () => {
  it("computes a per-axis difference (to − from)", () => {
    const from = scoreText("plain text");
    const to = scoreText("Buy now! Free deal! Save money!");
    const delta = scoreDelta(from, to);
    expect(delta.commercial).toBeGreaterThan(0);
    expect(Object.keys(delta).sort()).toEqual([...SCORE_KEYS].sort());
  });
});
