"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as Provider } from "posthog-js/react";
import { env } from "@/lib/env";

const key = env.NEXT_PUBLIC_POSTHOG_KEY;

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!key || posthog.__loaded) return;
    posthog.init(key, {
      api_host: env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      capture_pageview: true,
      capture_pageleave: true,
    });
  }, []);

  // When PostHog isn't configured, render children untouched.
  if (!key) return <>{children}</>;
  return <Provider client={posthog}>{children}</Provider>;
}
