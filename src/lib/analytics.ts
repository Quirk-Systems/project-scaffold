import { PostHog } from "posthog-node";
import { env } from "@/lib/env";

let cached: PostHog | null = null;

function getClient(): PostHog | null {
  if (!env.NEXT_PUBLIC_POSTHOG_KEY) return null;
  if (!cached) {
    cached = new PostHog(env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return cached;
}

export type CaptureInput = {
  event: string;
  distinctId: string;
  properties?: Record<string, unknown>;
};

// No-op when PostHog isn't configured, so call sites never need to guard.
// Analytics must also never take the caller down: a PostHog outage or bad
// key degrades to a warn + no-op instead of a thrown request error.
export async function capture(input: CaptureInput): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    client.capture({
      distinctId: input.distinctId,
      event: input.event,
      properties: input.properties,
    });
    await client.flush();
  } catch (err) {
    console.warn("[posthog] capture failed", err);
  }
}

export async function isFeatureEnabled(
  key: string,
  distinctId: string,
): Promise<boolean | undefined> {
  const client = getClient();
  if (!client) return undefined;
  try {
    return await client.isFeatureEnabled(key, distinctId);
  } catch (err) {
    // Unresolved (undefined) lets flag() fall through to its default.
    console.warn("[posthog] feature-flag lookup failed", err);
    return undefined;
  }
}
