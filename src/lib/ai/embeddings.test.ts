import { describe, expect, it } from "vitest";

import { EMBEDDING_DIMENSIONS } from "@/lib/db/search";

import {
  EMBEDDING_INPUT_MAX_CHARS,
  buildAssetEmbeddingInput,
  parseEmbeddingsResponse,
} from "./embeddings";

function vector(fill = 0): number[] {
  return new Array<number>(EMBEDDING_DIMENSIONS).fill(fill);
}

describe("buildAssetEmbeddingInput", () => {
  it("joins title and raw text", () => {
    expect(
      buildAssetEmbeddingInput({
        title: "Lo-fi loop",
        rawText: "A dreamy pad.",
      }),
    ).toBe("Lo-fi loop\n\nA dreamy pad.");
  });

  it("uses whichever field is present", () => {
    expect(buildAssetEmbeddingInput({ title: "Only title" })).toBe(
      "Only title",
    );
    expect(buildAssetEmbeddingInput({ rawText: "Only text" })).toBe(
      "Only text",
    );
  });

  it("returns null when there is nothing to embed", () => {
    expect(buildAssetEmbeddingInput({})).toBeNull();
    expect(
      buildAssetEmbeddingInput({ title: "   ", rawText: null }),
    ).toBeNull();
  });

  it("trims whitespace from each part", () => {
    expect(buildAssetEmbeddingInput({ title: "  a  ", rawText: " b " })).toBe(
      "a\n\nb",
    );
  });

  it("truncates oversized inputs", () => {
    const input = buildAssetEmbeddingInput({
      rawText: "x".repeat(EMBEDDING_INPUT_MAX_CHARS * 2),
    });
    expect(input).toHaveLength(EMBEDDING_INPUT_MAX_CHARS);
  });
});

describe("parseEmbeddingsResponse", () => {
  it("returns vectors in input order using the index field", () => {
    const payload = {
      data: [
        { index: 1, embedding: vector(1) },
        { index: 0, embedding: vector(0) },
      ],
    };
    const [first, second] = parseEmbeddingsResponse(payload, 2);
    expect(first![0]).toBe(0);
    expect(second![0]).toBe(1);
  });

  it("rejects a payload without a data array", () => {
    expect(() => parseEmbeddingsResponse({}, 1)).toThrow(/data array/);
    expect(() => parseEmbeddingsResponse(null, 1)).toThrow(/data array/);
  });

  it("rejects a count mismatch", () => {
    expect(() =>
      parseEmbeddingsResponse({ data: [{ index: 0, embedding: vector() }] }, 2),
    ).toThrow(/expected 2/);
  });

  it("rejects vectors of the wrong dimensionality", () => {
    expect(() =>
      parseEmbeddingsResponse(
        { data: [{ index: 0, embedding: [1, 2, 3] }] },
        1,
      ),
    ).toThrow(new RegExp(`${EMBEDDING_DIMENSIONS}-dimension`));
  });

  it("rejects malformed items", () => {
    expect(() => parseEmbeddingsResponse({ data: [null] }, 1)).toThrow(
      /not a .*vector/,
    );
    expect(() =>
      parseEmbeddingsResponse({ data: [{ index: 0, embedding: "nope" }] }, 1),
    ).toThrow(/not a .*vector/);
  });
});
