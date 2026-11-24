// @vitest-environment node
// Node rather than jsdom: embedAssetText reads server-only env to decide
// whether a provider is configured, which t3-env forbids when `window` exists.
import { describe, expect, it } from "vitest";

import {
  embedAssetText,
  embedText,
  EMBEDDING_DIMENSIONS,
  HASH_EMBEDDING_MODEL,
} from "./embeddings";

describe("embedAssetText", () => {
  // No EMBEDDINGS_API_KEY in the test environment, so these exercise the
  // offline fallback — the path every write takes until a provider is set up.
  it("falls back to the hash embedder and says so", async () => {
    const { embedding, model } = await embedAssetText("goblin chaos banana");
    expect(model).toBe(HASH_EMBEDDING_MODEL);
    expect(embedding).toHaveLength(EMBEDDING_DIMENSIONS);
  });

  it("returns exactly what the hash embedder produces", async () => {
    const text = "dreamy lo-fi pads";
    const { embedding } = await embedAssetText(text);
    expect(embedding).toEqual(embedText(text));
  });

  it("always reports a model, so no vector is ever stored untagged", async () => {
    for (const text of ["", "   ", "a real asset"]) {
      const { model } = await embedAssetText(text);
      expect(model).toBeTruthy();
    }
  });
});
