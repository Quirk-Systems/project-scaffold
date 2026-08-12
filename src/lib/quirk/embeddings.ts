import { contentWords } from "./text";

import { EMBEDDING_DIMENSIONS } from "@/lib/db/schema";

export { EMBEDDING_DIMENSIONS };

/**
 * Deterministic, dependency-free embedding. Hashes content words into a fixed
 * bag-of-features vector and L2-normalizes it. This is not as expressive as a
 * learned model, but it is stable, offline, and good enough to power
 * cosine-similarity nearest-neighbour search across the asset registry. Swap in
 * a real embedding provider here when an API key is available.
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
