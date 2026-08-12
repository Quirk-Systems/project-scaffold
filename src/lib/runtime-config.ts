export type RuntimeConfig = {
  appUrl?: string;
  posthogKey?: string;
  posthogHost?: string;
};

export function getRuntimeConfig(): RuntimeConfig {
  // Access through an alias so Next.js does not inline NEXT_PUBLIC_* at build time.
  const runtimeEnv = process.env;

  return {
    appUrl: runtimeEnv.NEXT_PUBLIC_APP_URL,
    posthogKey: runtimeEnv.NEXT_PUBLIC_POSTHOG_KEY,
    posthogHost: runtimeEnv.NEXT_PUBLIC_POSTHOG_HOST,
  };
}
