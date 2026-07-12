// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readGoldilocks } from "./goldilocks";
import type { QuirkScores } from "./scoring";

function scores(overrides: Partial<QuirkScores>): QuirkScores {
  return {
    hookDensity: 0.5,
    commercial: 0.5,
    funny: 0.5,
    weirdness: 0.5,
    emotionalCharge: 0.5,
    spawnPotential: 0.5,
    quality: 0.5,
    ...overrides,
  };
}

describe("readGoldilocks", () => {
  it("mints the just-right band", () => {
    const reading = readGoldilocks(scores({}));
    expect(reading.verdict).toBe("just_right");
    expect(reading.heat).toBeCloseTo(0.5, 3);
    expect(reading.reasons[0]).toContain("inside the band");
  });

  it("rules low quality too cold", () => {
    const reading = readGoldilocks(scores({ quality: 0.1 }));
    expect(reading.verdict).toBe("too_cold");
    expect(reading.reasons.join(" ")).toContain("quality 0.1 below floor");
  });

  it("rules a pulseless profile too cold even with passable quality", () => {
    const reading = readGoldilocks(
      scores({ hookDensity: 0.05, emotionalCharge: 0.1 }),
    );
    expect(reading.verdict).toBe("too_cold");
    expect(reading.reasons.join(" ")).toContain("no pulse");
  });

  it("rules weirdness-outrunning-quality too hot", () => {
    const reading = readGoldilocks(scores({ weirdness: 0.95, quality: 0.4 }));
    expect(reading.verdict).toBe("too_hot");
    expect(reading.reasons.join(" ")).toContain("outruns quality");
  });

  it("rules rant energy too hot", () => {
    const reading = readGoldilocks(
      scores({ emotionalCharge: 0.95, commercial: 0.1 }),
    );
    expect(reading.verdict).toBe("too_hot");
    expect(reading.reasons.join(" ")).toContain("rant energy");
  });

  it("lets high weirdness through when quality keeps pace", () => {
    const reading = readGoldilocks(scores({ weirdness: 0.95, quality: 0.8 }));
    expect(reading.verdict).toBe("just_right");
  });

  it("cold outranks hot when both trip", () => {
    const reading = readGoldilocks(scores({ quality: 0.1, weirdness: 0.95 }));
    expect(reading.verdict).toBe("too_cold");
  });

  it("defers to curation when there is no text signal", () => {
    const reading = readGoldilocks(null);
    expect(reading.verdict).toBe("just_right");
    expect(reading.reasons[0]).toContain("defers to curation");
  });
});
