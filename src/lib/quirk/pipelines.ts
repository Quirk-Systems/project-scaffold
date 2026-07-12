import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  quirkPipelines,
  quirkPipelineSteps,
  quirkPipelineRuns,
  type QuirkPipeline,
  type QuirkPipelineStep,
  type QuirkPipelineRun,
} from "@/lib/db/schema";
import { foremanRun, type StepExecutor } from "./agents";
import { getAsset, setAssetStatus } from "./assets";
import { proposeAnnotations, saveAnnotations } from "./annotations";
import { createDiff } from "./diffs";
import { createExperiment } from "./experiments";

export const DEFAULT_PIPELINE_STEPS: {
  stepKey: string;
  stepName: string;
  agentRole: string | null;
}[] = [
  { stepKey: "capture", stepName: "Capture", agentRole: "archivist_goblin" },
  { stepKey: "annotate", stepName: "Annotate", agentRole: "curator_imp" },
  { stepKey: "diff", stepName: "Semantic Diff", agentRole: "diff_witch" },
  { stepKey: "experiment", stepName: "Experiment", agentRole: "lab_rat_king" },
  { stepKey: "review", stepName: "Review", agentRole: null },
  { stepKey: "promote", stepName: "Promote", agentRole: "pipeline_foreman" },
  {
    stepKey: "publish",
    stepName: "Publish / Productize",
    agentRole: "pipeline_foreman",
  },
];

export async function listPipelines(): Promise<QuirkPipeline[]> {
  return db
    .select()
    .from(quirkPipelines)
    .orderBy(desc(quirkPipelines.createdAt));
}

export async function getPipeline(id: string): Promise<{
  pipeline: QuirkPipeline;
  steps: QuirkPipelineStep[];
  runs: QuirkPipelineRun[];
} | null> {
  const [pipeline] = await db
    .select()
    .from(quirkPipelines)
    .where(eq(quirkPipelines.id, id))
    .limit(1);
  if (!pipeline) return null;

  const steps = await db
    .select()
    .from(quirkPipelineSteps)
    .where(eq(quirkPipelineSteps.pipelineId, id))
    .orderBy(asc(quirkPipelineSteps.stepOrder));

  const runs = await db
    .select()
    .from(quirkPipelineRuns)
    .where(eq(quirkPipelineRuns.pipelineId, id))
    .orderBy(desc(quirkPipelineRuns.startedAt));

  return { pipeline, steps, runs };
}

export async function createPipeline(input: {
  name: string;
  description?: string | null;
  steps?: { stepKey: string; stepName: string; agentRole: string | null }[];
}): Promise<QuirkPipeline> {
  const steps = input.steps ?? DEFAULT_PIPELINE_STEPS;
  return db.transaction(async (tx) => {
    const [pipeline] = await tx
      .insert(quirkPipelines)
      .values({ name: input.name, description: input.description ?? null })
      .returning();

    await tx.insert(quirkPipelineSteps).values(
      steps.map((s, i) => ({
        pipelineId: pipeline.id,
        stepOrder: i + 1,
        stepKey: s.stepKey,
        stepName: s.stepName,
        agentRole: s.agentRole,
      })),
    );

    return pipeline;
  });
}

/** Create the canonical capture→…→publish pipeline if none exists yet. */
export async function ensureDefaultPipeline(): Promise<QuirkPipeline> {
  const existing = await db
    .select()
    .from(quirkPipelines)
    .orderBy(asc(quirkPipelines.createdAt))
    .limit(1);
  if (existing[0]) return existing[0];

  return createPipeline({
    name: "Quirk Spine",
    description:
      "capture → annotate → diff → experiment → review → promote → publish",
  });
}

/**
 * Pipeline Foreman entrypoint: drive an asset through the pipeline, executing
 * each automatable step and halting at the first human gate.
 */
export async function runPipeline(input: {
  pipelineId: string;
  assetId: string;
  startAfter?: string | null;
}): Promise<QuirkPipelineRun | null> {
  const found = await getPipeline(input.pipelineId);
  if (!found) return null;
  const asset = await getAsset(input.assetId);
  if (!asset) return null;

  const executor: StepExecutor = async (step) => {
    switch (step.stepKey) {
      case "capture":
        return { message: `Asset "${asset.asset.title}" already captured.` };
      case "annotate": {
        const proposals = await proposeAnnotations(input.assetId);
        const saved = proposals
          ? await saveAnnotations(input.assetId, "curator_imp", proposals)
          : [];
        return { message: `Saved ${saved.length} annotations.` };
      }
      case "diff": {
        const fresh = await getAsset(input.assetId);
        const versions = fresh?.versions ?? [];
        if (versions.length < 2) {
          return { message: "Skipped: needs at least two versions to diff." };
        }
        const diff = await createDiff({
          assetId: input.assetId,
          fromVersionId: versions[1].id,
          toVersionId: versions[0].id,
        });
        return { message: diff?.summary ?? "Diff computed." };
      }
      case "experiment": {
        const { runs } = await createExperiment({
          name: `Auto experiment for ${asset.asset.title}`,
          experimentType: "prompt",
          inputAssetId: input.assetId,
          variantCount: 4,
        });
        return { message: `Generated ${runs.length} variant runs.` };
      }
      case "promote":
        await setAssetStatus(input.assetId, "approved");
        return { message: "Asset promoted to approved." };
      case "publish":
        await setAssetStatus(input.assetId, "published");
        return { message: "Asset published." };
      default:
        return { message: `Step "${step.stepKey}" acknowledged.` };
    }
  };

  const result = await foremanRun(found.steps, {
    execute: executor,
    startAfter: input.startAfter ?? null,
  });

  const [run] = await db
    .insert(quirkPipelineRuns)
    .values({
      pipelineId: input.pipelineId,
      assetId: input.assetId,
      status: result.status,
      currentStep: result.currentStep,
      logs: result.logs,
      startedAt: new Date(),
      completedAt: result.status === "paused" ? null : new Date(),
    })
    .returning();

  return run;
}
