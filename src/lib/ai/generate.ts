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

// Adaptive thinking is supported on Opus 4.6+/Sonnet 4.6+ and the Claude 5
// family; only known legacy tiers (Haiku 4.5, Sonnet/Opus <= 4.5, Claude 3.x)
// require manual extended thinking with budget_tokens and 400 on the adaptive
// shape. Gate by the finite legacy list — an allow-list would wrongly reject
// every newly released model (e.g. claude-sonnet-5, claude-fable-5).
const LEGACY_THINKING_MODELS =
  /^claude-(3-|haiku-4-|opus-4-[0-5](?!\d)|sonnet-4-[0-5](?!\d))/;

function buildParams(prompt: string, options: GenerateOptions) {
  const model = options.model ?? DEFAULT_MODEL;
  // `effort` is only supported by recent Opus/Sonnet models and 400s on
  // others (e.g. Haiku 4.5). Default it only for the known-good default
  // model; when the caller overrides the model, send effort only if they
  // asked for it explicitly.
  const effort =
    options.effort ?? (model === DEFAULT_MODEL ? ("low" as const) : undefined);
  // Fail loudly rather than send a shape the model will reject: callers on
  // non-adaptive tiers should call the SDK directly with budget_tokens.
  if (options.thinking && LEGACY_THINKING_MODELS.test(model)) {
    throw new Error(
      `thinking maps to adaptive thinking, which ${model} does not support; ` +
        "use the Anthropic SDK directly with manual extended thinking for this model",
    );
  }
  // Enforce the "thinking off by default" contract explicitly: newer models
  // (e.g. the Claude 5 family) may run adaptive thinking BY DEFAULT, so
  // omitting the field would silently add reasoning latency/tokens. Send an
  // explicit `disabled` on modern models; legacy tiers keep the omitted
  // field (their default is off, and Claude 3.x predates the parameter).
  const thinking = options.thinking
    ? { thinking: { type: "adaptive" as const } }
    : LEGACY_THINKING_MODELS.test(model)
      ? {}
      : { thinking: { type: "disabled" as const } };
  return {
    model,
    max_tokens: options.maxTokens ?? 1024,
    system: composeSystem(options.persona, options.register),
    ...(effort ? { output_config: { effort } } : {}),
    ...thinking,
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
