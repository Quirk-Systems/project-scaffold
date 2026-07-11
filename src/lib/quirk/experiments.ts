import { asc, desc, eq } from "drizzle-orm";
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
 * Promote a winning run's output into a new canonical asset, and mint its
 * one-of-one offer — winners graduate straight to the drops board.
 */
export async function promoteRun(runId: string): Promise<{
  run: QuirkRun;
  offer: QuirkOffer | null;
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

  // Best-effort: promotion must never fail because minting did (e.g. a
  // transient voice-layer error). The manual mint endpoint is the recovery.
  let offer: QuirkOffer | null = null;
  try {
    offer = await mintOffer({ assetId: asset.id });
  } catch (e) {
    console.warn(`[quirk] auto-mint failed for asset ${asset.id}:`, e);
  }

  return { run: updated, offer };
}
