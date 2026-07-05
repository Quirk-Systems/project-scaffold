import { getAnthropic, DEFAULT_MODEL } from "./client";
import { composeSystem } from "./compose";
import type { PersonaName } from "./personas";
import type { RegisterName } from "./registers";

export type GenerateOptions = {
  persona?: PersonaName;
  register?: RegisterName;
  model?: string;
  // Tuned for short tone responses; raise for long-form output.
  maxTokens?: number;
  // Latency knob. Default "low": this layer is conversational and
  // latency-sensitive, not deep-reasoning. Raise for harder tasks.
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  // Off by default for snappy responses. Enable for multi-step reasoning.
  thinking?: boolean;
};

function buildParams(prompt: string, options: GenerateOptions) {
  const model = options.model ?? DEFAULT_MODEL;
  // `effort` is only supported by recent Opus/Sonnet models and 400s on
  // others (e.g. Haiku 4.5). Default it only for the known-good default
  // model; when the caller overrides the model, send effort only if they
  // asked for it explicitly.
  const effort =
    options.effort ?? (model === DEFAULT_MODEL ? ("low" as const) : undefined);
  return {
    model,
    max_tokens: options.maxTokens ?? 1024,
    system: composeSystem(options.persona, options.register),
    ...(effort ? { output_config: { effort } } : {}),
    ...(options.thinking ? { thinking: { type: "adaptive" as const } } : {}),
    messages: [{ role: "user" as const, content: prompt }],
  };
}

export async function generateText(
  prompt: string,
  options: GenerateOptions = {},
): Promise<string> {
  const message = await getAnthropic().messages.create(
    buildParams(prompt, options),
  );
  return message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
}

// Returns the raw MessageStream for advanced use (events, .finalMessage()).
export function createStream(prompt: string, options: GenerateOptions = {}) {
  return getAnthropic().messages.stream(buildParams(prompt, options));
}

// Convenience generator yielding text deltas — pipe to an SSE/Response stream
// or a typing-effect UI.
export async function* streamText(
  prompt: string,
  options: GenerateOptions = {},
): AsyncGenerator<string> {
  const stream = createStream(prompt, options);
  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}
