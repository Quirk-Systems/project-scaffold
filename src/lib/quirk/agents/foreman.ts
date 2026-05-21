import type { PipelineLogEntry, QuirkPipelineStep } from "@/lib/db/schema";

const HUMAN_GATE_KEYS = new Set(["review", "approve"]);

export function isHumanGate(
  step: Pick<QuirkPipelineStep, "stepKey" | "agentRole">,
): boolean {
  return HUMAN_GATE_KEYS.has(step.stepKey) || !step.agentRole;
}

export type StepExecutor = (
  step: QuirkPipelineStep,
) => Promise<{ message: string }> | { message: string };

export type ForemanResult = {
  logs: PipelineLogEntry[];
  status: "completed" | "paused" | "failed";
  currentStep: string | null;
};

/**
 * Pipeline Foreman — moves an asset through the workflow, calling the right
 * agent for each automatable step, logging every transition, and halting when a
 * human-approval gate is reached.
 */
export async function foremanRun(
  steps: QuirkPipelineStep[],
  options: { execute: StepExecutor; startAfter?: string | null },
): Promise<ForemanResult> {
  const ordered = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);
  const logs: PipelineLogEntry[] = [];

  let started = options.startAfter == null;
  for (const step of ordered) {
    if (!started) {
      if (step.stepKey === options.startAfter) started = true;
      continue;
    }

    if (isHumanGate(step)) {
      logs.push({
        step: step.stepKey,
        status: "halted",
        agentRole: step.agentRole ?? undefined,
        message: `Awaiting human approval at "${step.stepName}".`,
        at: new Date().toISOString(),
      });
      return { logs, status: "paused", currentStep: step.stepKey };
    }

    logs.push({
      step: step.stepKey,
      status: "started",
      agentRole: step.agentRole ?? undefined,
      message: `${step.stepName} started.`,
      at: new Date().toISOString(),
    });

    try {
      const result = await options.execute(step);
      logs.push({
        step: step.stepKey,
        status: "completed",
        agentRole: step.agentRole ?? undefined,
        message: result.message,
        at: new Date().toISOString(),
      });
    } catch (e) {
      logs.push({
        step: step.stepKey,
        status: "failed",
        agentRole: step.agentRole ?? undefined,
        message: e instanceof Error ? e.message : String(e),
        at: new Date().toISOString(),
      });
      return { logs, status: "failed", currentStep: step.stepKey };
    }
  }

  return { logs, status: "completed", currentStep: null };
}
