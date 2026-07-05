import { describe, it, expect, vi } from "vitest";
import { createLazyClient } from "./lazy-client";

describe("createLazyClient", () => {
  it("constructs lazily and memoizes", () => {
    const create = vi.fn(() => ({ ok: true }));
    const client = createLazyClient({
      name: "Test",
      requires: { TEST_KEY: "set" },
      create,
    });
    expect(create).not.toHaveBeenCalled();
    const a = client.get();
    const b = client.get();
    expect(create).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it("throws an aggregated error listing every missing var", () => {
    const client = createLazyClient({
      name: "Email",
      requires: { RESEND_API_KEY: undefined, AUTH_EMAIL_FROM: "" },
      create: () => ({}),
    });
    expect(() => client.assertConfigured()).toThrowError(
      "Email not configured: set RESEND_API_KEY, AUTH_EMAIL_FROM",
    );
  });

  it("never constructs when unconfigured", () => {
    const create = vi.fn(() => ({}));
    const client = createLazyClient({
      name: "Test",
      requires: { TEST_KEY: undefined },
      create,
    });
    expect(() => client.get()).toThrow(/not configured/);
    expect(create).not.toHaveBeenCalled();
  });
});
