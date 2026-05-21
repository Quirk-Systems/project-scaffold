import { describe, it, expect } from "vitest";
import { archivistIngest } from "@/lib/quirk/agents/archivist";
import { curatorPropose } from "@/lib/quirk/agents/curator";
import { diffWitchCompare } from "@/lib/quirk/agents/diff-witch";
import { labRatGenerate, pickWinner } from "@/lib/quirk/agents/lab-rat-king";
import { foremanRun, isHumanGate } from "@/lib/quirk/agents/foreman";
import { embedText, EMBEDDING_DIMENSIONS } from "@/lib/quirk/embeddings";
import type { QuirkPipelineStep } from "@/lib/db/schema";

describe("Archivist Goblin", () => {
  it("detects a web clip from a URL with no text", () => {
    const result = archivistIngest({ sourceUrl: "https://example.com/post" });
    expect(result.assetType).toBe("web_clip");
    expect(result.metadata.has_source).toBe(true);
  });

  it("detects a song from section markers", () => {
    const result = archivistIngest({
      rawText: "[Verse 1]\nsome words\n[Chorus]\nmore words",
    });
    expect(result.assetType).toBe("song");
  });

  it("derives a title from the first line and builds a v1 snapshot", () => {
    const result = archivistIngest({ rawText: "My great idea\nmore detail" });
    expect(result.title).toBe("My great idea");
    expect(result.snapshot.rawText).toContain("My great idea");
    expect(result.metadata.word_count).toBeGreaterThan(0);
  });
});

describe("Curator Imp", () => {
  it("proposes a spread of annotation types", () => {
    const proposals = curatorPropose({
      rawText: "What if we sold a funny weird product? Buy now and save money.",
      assetType: "text",
    });
    const types = new Set(proposals.map((p) => p.annotationType));
    expect(types.has("tag")).toBe(true);
    expect(types.has("theme")).toBe(true);
    expect(types.has("persona_fit")).toBe(true);
    for (const p of proposals) {
      expect(p.confidence).toBeGreaterThanOrEqual(0);
      expect(p.confidence).toBeLessThanOrEqual(1);
    }
  });
});

describe("Diff Witch", () => {
  it("reports additions, removals, and a score delta", () => {
    const result = diffWitchCompare({
      fromText: "a plain line\nsecond line",
      toText: "a plain line\nBuy now and save money!",
    });
    expect(result.additions).toContain("Buy now and save money!");
    expect(result.removals).toContain("second line");
    expect(typeof result.summary).toBe("string");
    expect(result.scoreDelta.commercial).toBeGreaterThan(0);
  });
});

describe("Lab Rat King", () => {
  it("generates the requested number of variants including a control", () => {
    const variants = labRatGenerate({ text: "a small idea", count: 4 });
    expect(variants).toHaveLength(4);
    expect(variants[0].label).toBe("control");
    const winner = pickWinner(variants);
    expect(winner).toBeGreaterThanOrEqual(0);
    expect(winner).toBeLessThan(variants.length);
  });

  it("clamps the variant count into a sane range", () => {
    expect(labRatGenerate({ text: "x", count: 99 }).length).toBeLessThanOrEqual(
      11,
    );
    expect(
      labRatGenerate({ text: "x", count: 1 }).length,
    ).toBeGreaterThanOrEqual(2);
  });
});

describe("Pipeline Foreman", () => {
  const steps: QuirkPipelineStep[] = [
    step(1, "capture", "archivist_goblin"),
    step(2, "annotate", "curator_imp"),
    step(3, "review", null),
    step(4, "publish", "pipeline_foreman"),
  ];

  it("flags human gates", () => {
    expect(isHumanGate({ stepKey: "review", agentRole: null })).toBe(true);
    expect(isHumanGate({ stepKey: "annotate", agentRole: "curator_imp" })).toBe(
      false,
    );
  });

  it("runs auto steps and halts at the first human gate", async () => {
    const result = await foremanRun(steps, {
      execute: (s) => ({ message: `did ${s.stepKey}` }),
    });
    expect(result.status).toBe("paused");
    expect(result.currentStep).toBe("review");
    const completed = result.logs.filter((l) => l.status === "completed");
    expect(completed.map((l) => l.step)).toEqual(["capture", "annotate"]);
  });

  it("can resume after a gate and complete", async () => {
    const result = await foremanRun(steps, {
      execute: (s) => ({ message: `did ${s.stepKey}` }),
      startAfter: "review",
    });
    expect(result.status).toBe("completed");
    expect(result.currentStep).toBeNull();
  });
});

describe("embeddings", () => {
  it("produces a normalized fixed-length vector", () => {
    const v = embedText("goblin chaos banana");
    expect(v).toHaveLength(EMBEDDING_DIMENSIONS);
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it("returns a zero vector for empty text", () => {
    const v = embedText("");
    expect(v.every((x) => x === 0)).toBe(true);
  });
});

function step(
  order: number,
  key: string,
  role: string | null,
): QuirkPipelineStep {
  return {
    id: `step-${order}`,
    pipelineId: "pipeline-1",
    stepOrder: order,
    stepKey: key,
    stepName: key,
    agentRole: role,
    config: {},
    createdAt: new Date(),
  };
}
