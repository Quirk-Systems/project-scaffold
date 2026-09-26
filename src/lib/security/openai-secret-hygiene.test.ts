import { describe, expect, it } from "vitest";

import {
  scanTextForOpenAiSecretLeak,
  scanWorkflowLineForOpenAiLeak,
} from "./openai-secret-hygiene";

describe("scanTextForOpenAiSecretLeak", () => {
  it("flags browser-exposed OpenAI env references", () => {
    expect(
      scanTextForOpenAiSecretLeak(
        "const key = process.env.NEXT_PUBLIC_OPENAI_API_KEY;",
      ),
    ).toContain("forbidden public OpenAI env reference");
  });

  it("flags OpenAI-style key literals", () => {
    const leaked = `OPENAI_API_KEY=${"sk-" + "a".repeat(30)}`;
    expect(scanTextForOpenAiSecretLeak(leaked)).toContain(
      "OpenAI-style key literal",
    );
  });
});

describe("scanWorkflowLineForOpenAiLeak", () => {
  it("accepts GitHub secret binding", () => {
    expect(
      scanWorkflowLineForOpenAiLeak(
        "OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}",
      ),
    ).toEqual([]);
  });

  it("supports inline env mapping syntax", () => {
    expect(
      scanWorkflowLineForOpenAiLeak(
        "env: { OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }} }",
      ),
    ).toEqual([]);
  });

  it("rejects unsafe workflow binding and secret logging", () => {
    expect(
      scanWorkflowLineForOpenAiLeak(
        "OPENAI_API_KEY: ${{ vars.OPENAI_API_KEY }}",
      ),
    ).toContain("workflow OpenAI key binding must use secrets.OPENAI_API_KEY");
    expect(
      scanWorkflowLineForOpenAiLeak("run: echo $OPENAI_API_KEY"),
    ).toContain("workflow logs OpenAI key");
  });
});
