import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import { createLazyClient } from "@/lib/lazy-client";

// Default model for the persona/register layer. Opus 4.7 is the most capable
// model; override per-call via GenerateOptions.model when a cheaper tier fits.
export const DEFAULT_MODEL = "claude-opus-4-7";

const client = createLazyClient({
  name: "AI",
  requires: { ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY },
  create: () => new Anthropic({ apiKey: env.ANTHROPIC_API_KEY! }),
});

export const getAnthropic = client.get;
export const assertAiConfigured = client.assertConfigured;
