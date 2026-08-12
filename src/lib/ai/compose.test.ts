import { describe, it, expect } from "vitest";
import { composeSystem } from "./compose";
import { animationFor } from "./animation";
import { getRegister, registerNames } from "./registers";

describe("composeSystem", () => {
  it("puts the cache breakpoint on the persona prefix only", () => {
    const blocks = composeSystem("house", "deadpan");
    expect(blocks).toHaveLength(2);
    expect(blocks[0].cache_control).toEqual({ type: "ephemeral" });
    expect(blocks[1].cache_control).toBeUndefined();
  });

  it("appends the register directive after the persona", () => {
    const blocks = composeSystem("house", "swoon");
    expect(blocks[1].text).toBe(getRegister("swoon").directive);
  });
});

describe("animationFor", () => {
  it("is fully still when idle", () => {
    expect(animationFor({ phase: "idle" }).intensity).toBe(0);
  });

  it("calms motion once settled", () => {
    const streaming = animationFor({ phase: "streaming", register: "hype" });
    const settled = animationFor({ phase: "settled", register: "hype" });
    expect(settled.intensity).toBeLessThan(streaming.intensity);
  });
});

describe("registers", () => {
  it("exposes the expected register names", () => {
    expect(registerNames).toEqual(
      expect.arrayContaining(["straight", "deadpan", "mock_panic", "swoon"]),
    );
  });
});
