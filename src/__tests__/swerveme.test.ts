import { describe, expect, it } from "vitest";
import {
  generateSwervemeCandidates,
  SWERVEME_COVENANT,
  SWERVEME_SOURCE_PHRASE,
  SWERVEME_V1_STEPS,
} from "@/lib/quirk/swerveme";

describe("SWERVEME_V1", () => {
  it("spawns exactly four named strategies with explicit lineage", () => {
    const candidates = generateSwervemeCandidates({
      sourceId: "source-001",
      text: SWERVEME_SOURCE_PHRASE,
    });

    expect(candidates.map((candidate) => candidate.strategy)).toEqual([
      "bone",
      "wild",
      "bridge",
      "bounty",
    ]);
    expect(candidates.every((candidate) => candidate.outcome === "pending")).toBe(true);
    expect(candidates.every((candidate) =>
      candidate.lineage.parentIds.includes("source-001"),
    )).toBe(true);
    expect(new Set(candidates.map((candidate) => candidate.output)).size).toBe(4);
  });

  it("defaults to the naming phrase as the initial Squirther", () => {
    const [candidate] = generateSwervemeCandidates({ sourceId: "source-001" });
    expect(candidate.output).toContain(SWERVEME_SOURCE_PHRASE);
  });

  it("halts at a named human council before promotion", () => {
    const council = SWERVEME_V1_STEPS.find((step) => step.stepKey === "review");
    expect(council).toMatchObject({
      stepName: "Sureslurper Council",
      agentRole: null,
    });
    expect(SWERVEME_COVENANT.minimumSourceCare).toBe(9);
  });
});
