// @vitest-environment node
import { describe, it, expect } from "vitest";
import { fallbackPitch, buildPitchPrompt } from "./offers";
import { scoreText } from "./scoring";

describe("fallbackPitch", () => {
  it("names the strongest score axis", () => {
    const scores = scoreText(
      "Buy this limited offer now — a hilarious, unhinged deal!",
    );
    const pitch = fallbackPitch("Test Drop", scores);
    expect(pitch).toContain("Test Drop — one of one.");
    expect(pitch).toContain("Claimed once, gone forever.");
    expect(pitch).toMatch(/Peak [a-z ]+\./);
  });

  it("works without scores (media assets)", () => {
    const pitch = fallbackPitch("Golden Hour Print", null);
    expect(pitch).toBe(
      "Golden Hour Print — one of one. Curated signal. Claimed once, gone forever.",
    );
  });
});

describe("buildPitchPrompt", () => {
  it("embeds title, signal, and material excerpt", () => {
    const scores = scoreText("some text");
    const prompt = buildPitchPrompt("My Drop", "the raw material", scores);
    expect(prompt).toContain('titled "My Drop"');
    expect(prompt).toContain("the raw material");
    expect(prompt).toContain("quality:");
  });

  it("marks media assets without raw text", () => {
    const prompt = buildPitchPrompt("Photo Drop", null, null);
    expect(prompt).toContain("(visual/media asset)");
    expect(prompt).toContain("unscored");
  });

  it("truncates long material to keep the prompt bounded", () => {
    const prompt = buildPitchPrompt("Long", "x".repeat(5000), null);
    expect(prompt.length).toBeLessThan(1500);
  });
});
