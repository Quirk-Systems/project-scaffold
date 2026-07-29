import { describe, expect, it } from "vitest";

import { EMBEDDING_DIMENSIONS, normalizeSearchParams } from "./search";

function embedding(): number[] {
  return new Array(EMBEDDING_DIMENSIONS).fill(0);
}

describe("normalizeSearchParams", () => {
  it("applies default limit and offset", () => {
    const p = normalizeSearchParams({});
    expect(p.limit).toBe(20);
    expect(p.offset).toBe(0);
  });

  it("clamps limit into the 1..100 range", () => {
    expect(normalizeSearchParams({ limit: 0 }).limit).toBe(1);
    expect(normalizeSearchParams({ limit: -10 }).limit).toBe(1);
    expect(normalizeSearchParams({ limit: 9999 }).limit).toBe(100);
  });

  it("never returns a negative offset", () => {
    expect(normalizeSearchParams({ offset: -5 }).offset).toBe(0);
  });

  it("trims text and drops blank strings", () => {
    expect(normalizeSearchParams({ text: "  hello  " }).text).toBe("hello");
    expect(normalizeSearchParams({ text: "   " }).text).toBeUndefined();
  });

  it("lower-cases, trims, and de-duplicates tags", () => {
    expect(
      normalizeSearchParams({ tags: ["Lo-Fi", " lo-fi ", "Dreamy"] }).tags,
    ).toEqual(["lo-fi", "dreamy"]);
  });

  it("drops the tags field when nothing survives normalization", () => {
    expect(normalizeSearchParams({ tags: ["  ", ""] }).tags).toBeUndefined();
  });

  it("de-duplicates asset types and statuses", () => {
    const p = normalizeSearchParams({
      assetTypes: ["song", "song", "image"],
      statuses: ["captured", "captured"],
    });
    expect(p.assetTypes).toEqual(["song", "image"]);
    expect(p.statuses).toEqual(["captured"]);
  });

  it("clamps minSimilarity into the 0..1 range", () => {
    expect(
      normalizeSearchParams({ embedding: embedding(), minSimilarity: 2 })
        .minSimilarity,
    ).toBe(1);
    expect(
      normalizeSearchParams({ embedding: embedding(), minSimilarity: -1 })
        .minSimilarity,
    ).toBe(0);
  });

  it("accepts an embedding of the expected dimensionality", () => {
    expect(() =>
      normalizeSearchParams({ embedding: embedding() }),
    ).not.toThrow();
  });

  it("rejects an embedding with the wrong dimensionality", () => {
    expect(() => normalizeSearchParams({ embedding: [1, 2, 3] })).toThrow(
      RangeError,
    );
  });
});
