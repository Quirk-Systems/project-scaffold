"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as Provider } from "posthog-js/react";
import { useRuntimeConfig } from "@/components/runtime-config-provider";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { posthogKey, posthogHost } = useRuntimeConfig();

  useEffect(() => {
    if (!posthogKey || posthog.__loaded) return;
    posthog.init(posthogKey, {
      api_host: posthogHost ?? "https://us.i.posthog.com",
      // "history_change" captures the initial load AND App Router client-side
      // navigations; `true` (legacy default) only captures full page loads.
      capture_pageview: "history_change",
      capture_pageleave: true,
    });
    // Runtime config is fixed for the browser session and refreshes on reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When PostHog isn't configured, render children untouched.
  if (!posthogKey) return <>{children}</>;
  return <Provider client={posthog}>{children}</Provider>;
}
