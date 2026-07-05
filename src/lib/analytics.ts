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
export async function capture(input: CaptureInput): Promise<void> {
  const client = getClient();
  if (!client) return;
  client.capture({
    distinctId: input.distinctId,
    event: input.event,
    properties: input.properties,
  });
  await client.flush();
}

export async function isFeatureEnabled(
  key: string,
  distinctId: string,
): Promise<boolean | undefined> {
  const client = getClient();
  if (!client) return undefined;
  return client.isFeatureEnabled(key, distinctId);
}
