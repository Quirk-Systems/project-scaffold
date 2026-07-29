import { afterEach, describe, expect, it, vi } from "vitest";
import { getRuntimeConfig } from "@/lib/runtime-config";

describe("getRuntimeConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads public configuration from the current server environment", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "runtime-key");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://posthog.example.com");

    expect(getRuntimeConfig()).toEqual({
      appUrl: "https://app.example.com",
      posthogKey: "runtime-key",
      posthogHost: "https://posthog.example.com",
    });

    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "promoted-runtime-key");
    expect(getRuntimeConfig().posthogKey).toBe("promoted-runtime-key");
  });
});
