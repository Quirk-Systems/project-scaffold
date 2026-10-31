// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("environment validation after the Zod migration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SKIP_ENV_VALIDATION", undefined);
    vi.stubEnv("AUTH_SECRET", undefined);
    vi.stubEnv("DATABASE_URL", undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("still rejects production configuration without required secrets", async () => {
    const { requireProductionEnv } = await import("./env");
    expect(requireProductionEnv).toThrow(
      "Production build requires: AUTH_SECRET, DATABASE_URL",
    );
  });

  it("accepts configured production and keeps optional values optional", async () => {
    vi.stubEnv("AUTH_SECRET", "synthetic-test-secret");
    vi.stubEnv("DATABASE_URL", "postgres://localhost/test");
    vi.stubEnv("RESEND_API_KEY", "");
    const { env, requireProductionEnv } = await import("./env");
    expect(requireProductionEnv).not.toThrow();
    expect(env.RESEND_API_KEY).toBeUndefined();
  });

  it("rejects an invalid configured public URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "not-a-url");
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(import("./env")).rejects.toThrow(
      "Invalid environment variables",
    );
  });
});
