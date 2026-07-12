import { isFeatureEnabled } from "@/lib/analytics";

// Static, env-driven flags: set FLAG_<UPPER_SNAKE>=true to force on.
// Reads process.env directly (not the typed env schema) so projects can add
// flags without editing src/lib/env.ts.
function envFlag(name: string): boolean | undefined {
  const raw = process.env[`FLAG_${name.toUpperCase().replace(/-/g, "_")}`];
  if (raw === undefined) return undefined;
  return raw === "true" || raw === "1";
}

export type FlagOptions = {
  // When provided, an unresolved flag falls back to PostHog for this user.
  distinctId?: string;
  default?: boolean;
};

// Resolution order: env override → PostHog (if distinctId given) → default.
export async function flag(
  name: string,
  options: FlagOptions = {},
): Promise<boolean> {
  const fromEnv = envFlag(name);
  if (fromEnv !== undefined) return fromEnv;

  if (options.distinctId) {
    const fromPostHog = await isFeatureEnabled(name, options.distinctId);
    if (fromPostHog !== undefined) return fromPostHog;
  }

  return options.default ?? false;
}
