export type ProcessingState =
  | "received"
  | "normalized"
  | "classified"
  | "enriched"
  | "validated"
  | "routed"
  | "emitted"
  | "quarantined"
  | "failed";

export interface ProcessingEnvelope<T = unknown> {
  id: `qdata_${string}`;
  version: string;
  state: ProcessingState;
  source: string;
  purpose: string;
  classification: "public" | "internal" | "personal" | "restricted";
  payload: T;
  provenance: {
    createdAt: string;
    actorId: string;
    sourceRefs: string[];
  };
  diagnostics: string[];
}

export interface ProcessingStep<TInput, TOutput> {
  id: string;
  run(input: ProcessingEnvelope<TInput>): Promise<ProcessingEnvelope<TOutput>>;
}

export async function runProcessingPipeline<T>(
  initial: ProcessingEnvelope<T>,
  steps: Array<ProcessingStep<unknown, unknown>>,
): Promise<ProcessingEnvelope<unknown>> {
  let current: ProcessingEnvelope<unknown> = initial;
  for (const step of steps) {
    if (current.state === "quarantined" || current.state === "failed") {
      break;
    }
    current = await step.run(current);
  }
  return current;
}

export function quarantine<T>(
  envelope: ProcessingEnvelope<T>,
  reason: string,
): ProcessingEnvelope<T> {
  return {
    ...envelope,
    state: "quarantined",
    diagnostics: [...envelope.diagnostics, reason],
  };
}
