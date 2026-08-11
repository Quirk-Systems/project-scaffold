import { asc, desc, eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  quirkExperiments,
  quirkRuns,
  type QuirkExperiment,
  type QuirkRun,
} from "@/lib/db/schema";
import { labRatGenerate, pickWinner } from "./agents";
import { captureAsset, getAsset, setAssetStatus } from "./assets";
import { mintOffer } from "./offers";
import { readGoldilocks, type GoldilocksReading } from "./goldilocks";
import { scoreText } from "./scoring";
import type { QuirkOffer } from "@/lib/db/schema";

export async function listExperiments(): Promise<QuirkExperiment[]> {
  return db
    .select()
    .from(quirkExperiments)
    .orderBy(desc(quirkExperiments.createdAt));
}

export async function getExperiment(id: string): Promise<{
  experiment: QuirkExperiment;
  runs: QuirkRun[];
} | null> {
  const [experiment] = await db
    .select()
    .from(quirkExperiments)
    .where(eq(quirkExperiments.id, id))
    .limit(1);
  if (!experiment) return null;

  const runs = await db
    .select()
    .from(quirkRuns)
    .where(eq(quirkRuns.experimentId, id))
    .orderBy(asc(quirkRuns.createdAt));

  return { experiment, runs };
}

/**
 * Lab Rat King entrypoint: create an experiment and, when an input asset is
 * given, generate scored variants as runs.
 */
export async function createExperiment(input: {
  name: string;
  experimentType: QuirkExperiment["experimentType"];
  objective?: string | null;
  inputAssetId?: string | null;
  variantCount?: number;
  model?: string | null;
  persona?: string | null;
  mask?: string | null;
}): Promise<{ experiment: QuirkExperiment; runs: QuirkRun[] }> {
  const [experiment] = await db
    .insert(quirkExperiments)
    .values({
      name: input.name,
      experimentType: input.experimentType,
      objective: input.objective ?? null,
      status: "running",
    })
    .returning();

  if (!input.inputAssetId) return { experiment, runs: [] };

  const found = await getAsset(input.inputAssetId);
  const baseText = found?.asset.rawText ?? "";
  const variants = labRatGenerate({
    text: baseText,
    count: input.variantCount,
  });
  const winnerIdx = pickWinner(variants);

  const runs = await db
    .insert(quirkRuns)
    .values(
      variants.map((v, i) => ({
        experimentId: experiment.id,
        inputAssetId: input.inputAssetId ?? null,
        model: input.model ?? "heuristic-lab-rat",
        persona: input.persona ?? null,
        mask: input.mask ?? null,
        prompt: v.prompt,
        parameters: { variant: v.label, output: v.output },
        metrics: v.scores,
        score: v.score,
        outcome: (i === winnerIdx
          ? "winner"
          : "pending") as QuirkRun["outcome"],
        notes: v.label,
      })),
    )
    .returning();

  return { experiment, runs };
}

export async function scoreRun(
  runId: string,
  input: { outcome?: QuirkRun["outcome"]; score?: number; notes?: string },
): Promise<QuirkRun | null> {
  const [updated] = await db
    .update(quirkRuns)
    .set({
      ...(input.outcome ? { outcome: input.outcome } : {}),
      ...(input.score != null ? { score: input.score } : {}),
      ...(input.notes != null ? { notes: input.notes } : {}),
    })
    .where(eq(quirkRuns.id, runId))
    .returning();
  return updated ?? null;
}

/**
 * Promote a winning run's output into a new canonical asset, and — if the
 * Goldilocks gate reads it just right — mint its one-of-one offer. Too-cold
 * and too-hot winners still promote; they just wait for a human to mint
 * manually (POST /api/offers bypasses the gate).
 */
export async function promoteRun(runId: string): Promise<{
  run: QuirkRun;
  offer: QuirkOffer | null;
  goldilocks: GoldilocksReading;
} | null> {
  const [run] = await db
    .select()
    .from(quirkRuns)
    .where(eq(quirkRuns.id, runId))
    .limit(1);
  if (!run) return null;

  const output = (run.parameters as { output?: unknown }).output;
  const text = typeof output === "string" ? output : "";

  const { asset } = await captureAsset({
    title: `Promoted: ${run.notes ?? "winning run"}`,
    rawText: text,
    metadata: { promoted_from_run: run.id, experiment_id: run.experimentId },
  });
  await setAssetStatus(asset.id, "approved");

  const [updated] = await db
    .update(quirkRuns)
    .set({ outcome: "winner", outputAssetId: asset.id })
    .where(eq(quirkRuns.id, runId))
    .returning();
  if (!updated) return null;

  const goldilocks = readGoldilocks(text ? scoreText(text) : null);

  // Best-effort: promotion must never fail because minting did (e.g. a
  // transient voice-layer error). The manual mint endpoint is the recovery.
  let offer: QuirkOffer | null = null;
  if (goldilocks.verdict === "just_right") {
    try {
      offer = await mintOffer({ assetId: asset.id });
    } catch (e) {
      console.warn(`[quirk] auto-mint failed for asset ${asset.id}:`, e);
    }
  } else {
    console.warn(
      `[quirk] goldilocks held the mint for asset ${asset.id} (${goldilocks.verdict}): ${goldilocks.reasons.join("; ")}`,
    );
  }

  return { run: updated, offer, goldilocks };
}

/**
 * Lab Rat King auto-promote: find the highest-scoring pending run in an
 * experiment whose score meets or exceeds `qualityThreshold` (default 0.5),
 * and promote it. Returns null if no eligible run exists.
 *
 * This is the automated path; manual promote via POST /api/runs/[id]/promote
 * remains available for curator override.
 */
export async function autoPromoteExperiment(
  experimentId: string,
  qualityThreshold = 0.5,
): Promise<{
  run: QuirkRun;
  offer: QuirkOffer | null;
  goldilocks: GoldilocksReading;
} | null> {
  const pendingRuns = await db
    .select()
    .from(quirkRuns)
    .where(
      and(
        eq(quirkRuns.experimentId, experimentId),
        eq(quirkRuns.outcome, "pending"),
      ),
    )
    .orderBy(desc(quirkRuns.score));

  const eligible = pendingRuns.filter(
    (r) => r.score !== null && r.score >= qualityThreshold,
  );
  if (eligible.length === 0) return null;

  const best = eligible[0];
  return promoteRun(best.id);
}
