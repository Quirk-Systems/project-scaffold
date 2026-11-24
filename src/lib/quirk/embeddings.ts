import { contentWords } from "./text";

import {
  embedText as embedTextRemote,
  getConfiguredEmbeddingModel,
  isEmbeddingsConfigured,
} from "@/lib/ai/embeddings";
import { EMBEDDING_DIMENSIONS } from "@/lib/db/schema";

export { EMBEDDING_DIMENSIONS };

/** Model identifier recorded for vectors produced by the hash fallback. */
export const HASH_EMBEDDING_MODEL = "hash-fnv1a-v1";

/** An embedding together with the space it belongs to. */
export interface EmbeddingResult {
  embedding: number[];
  model: string;
}

/**
 * The write path's single embedding entry point: uses the configured provider
 * when EMBEDDINGS_API_KEY is set and the offline hash otherwise, and always
 * reports which one produced the vector.
 *
 * Callers must persist `model` alongside `embedding`. The two embedders agree
 * on width but not on meaning, so a vector is only ever comparable to vectors
 * carrying the same model — see `quirk_assets.embedding_model`.
 *
 * A provider failure falls back to the hash rather than aborting the write: an
 * asset that is captured but awkward to search beats an asset that was never
 * captured, and `embedPendingAssets()` repairs the row on its next run.
 */
export async function embedAssetText(text: string): Promise<EmbeddingResult> {
  if (isEmbeddingsConfigured()) {
    const result = await embedTextRemote(text);
    if (result.ok) {
      return { embedding: result.value, model: getConfiguredEmbeddingModel() };
    }
  }
  return { embedding: embedText(text), model: HASH_EMBEDDING_MODEL };
}

/**
 * Deterministic, dependency-free embedding. Hashes content words into a fixed
 * bag-of-features vector and L2-normalizes it. Stable and offline, but not as
 * expressive as a learned model: it is the fallback behind `embedAssetText()`,
 * which is what write paths should call. Vectors from here are tagged
 * `HASH_EMBEDDING_MODEL` and are not comparable to provider vectors.
 */
export function embedText(text: string): number[] {
  const vec = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  const words = contentWords(text ?? "");
  if (words.length === 0) return vec;

  for (const word of words) {
    const h = hash(word);
    const idx = h % EMBEDDING_DIMENSIONS;
    const sign = (h >>> 31) & 1 ? -1 : 1;
    vec[idx] += sign;
  }

  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm);
  if (norm === 0) return vec;
  for (let i = 0; i < vec.length; i++) vec[i] = vec[i] / norm;
  return vec;
}

// FNV-1a 32-bit.
function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
