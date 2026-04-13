import { describe, expect, it } from "vitest";
import { mapWithConcurrency } from "./concurrency.js";

describe("mapWithConcurrency", () => {
  it("preserves input order in results", async () => {
    const items = [10, 30, 5, 20, 15];
    const out = await mapWithConcurrency(items, 2, async (n) => {
      await new Promise((r) => setTimeout(r, n));
      return n * 2;
    });
    expect(out).toEqual([20, 60, 10, 40, 30]);
  });

  it("never exceeds the concurrency cap", async () => {
    let active = 0;
    let maxActive = 0;
    const items = Array.from({ length: 20 }, (_, i) => i);

    await mapWithConcurrency(items, 4, async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
    });

    expect(maxActive).toBeLessThanOrEqual(4);
  });

  it("handles an empty input", async () => {
    const out = await mapWithConcurrency([], 4, async (n: number) => n);
    expect(out).toEqual([]);
  });

  it("propagates rejections", async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error("boom");
        return n;
      }),
    ).rejects.toThrow("boom");
  });
});
