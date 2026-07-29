import { EMBEDDING_DIMENSIONS } from "@/lib/db/search";
import { env } from "@/lib/env";
import { createLazyClient, type LazyClient } from "@/lib/lazy-client";
import type { Result } from "@/lib/result";
import { map, tryCatchAsync } from "@/lib/result";

// Anthropic does not offer an embeddings API, so this client speaks the
// OpenAI-compatible `/embeddings` wire format over plain fetch — no SDK
// dependency, and EMBEDDINGS_BASE_URL points it at any compatible provider
// (OpenAI, Azure, LiteLLM, Ollama, …). The default model's native 1536
// dimensions match the `quirk_assets.embedding` pgvector column.
export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_BASE_URL = "https://api.openai.com/v1";

/** Inputs are truncated to this length; embedding models have ~8k-token windows. */
export const EMBEDDING_INPUT_MAX_CHARS = 8000;

const MAX_BATCH_SIZE = 100;

type EmbeddingsConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

// Constructed on first use rather than at module load: t3-env forbids reading
// server vars when `window` exists, and deferring keeps this module importable
// from jsdom unit tests that only exercise the pure helpers below.
let client: LazyClient<EmbeddingsConfig> | null = null;

function getClient(): LazyClient<EmbeddingsConfig> {
  client ??= createLazyClient({
    name: "Embeddings",
    requires: { EMBEDDINGS_API_KEY: env.EMBEDDINGS_API_KEY },
    create: () => ({
      apiKey: env.EMBEDDINGS_API_KEY!,
      baseUrl: (env.EMBEDDINGS_BASE_URL ?? DEFAULT_BASE_URL).replace(
        /\/+$/,
        "",
      ),
      model: env.EMBEDDINGS_MODEL ?? DEFAULT_EMBEDDING_MODEL,
    }),
  });
  return client;
}

export function isEmbeddingsConfigured(): boolean {
  return Boolean(env.EMBEDDINGS_API_KEY);
}

export function assertEmbeddingsConfigured(): void {
  getClient().assertConfigured();
}

/**
 * Combine an asset's text fields into a single embedding input, or null when
 * the asset has nothing to embed. Pure, so callers can decide up front which
 * rows are embeddable.
 */
export function buildAssetEmbeddingInput(asset: {
  title?: string | null;
  rawText?: string | null;
}): string | null {
  const parts = [asset.title?.trim(), asset.rawText?.trim()].filter(
    (part): part is string => Boolean(part),
  );
  if (parts.length === 0) return null;
  return parts.join("\n\n").slice(0, EMBEDDING_INPUT_MAX_CHARS);
}

/**
 * Validate an OpenAI-compatible `/embeddings` payload and return the vectors
 * in input order. Throws on a count or dimension mismatch so a misconfigured
 * provider (wrong model, wrong dims) fails loudly instead of storing garbage.
 */
export function parseEmbeddingsResponse(
  payload: unknown,
  expectedCount: number,
): number[][] {
  if (typeof payload !== "object" || payload === null || !("data" in payload)) {
    throw new Error("Embeddings response is missing the data array");
  }
  const data = (payload as { data: unknown }).data;
  if (!Array.isArray(data) || data.length !== expectedCount) {
    const received = Array.isArray(data) ? data.length : 0;
    throw new Error(
      `Embeddings response returned ${received} embeddings, expected ${expectedCount}`,
    );
  }

  const items = data.map((item, position) => {
    const { index, embedding } = (item ?? {}) as {
      index?: unknown;
      embedding?: unknown;
    };
    if (
      !Array.isArray(embedding) ||
      embedding.length !== EMBEDDING_DIMENSIONS ||
      !embedding.every((value) => typeof value === "number")
    ) {
      throw new Error(
        `Embeddings response item ${position} is not a ${EMBEDDING_DIMENSIONS}-dimension vector`,
      );
    }
    return {
      index: typeof index === "number" ? index : position,
      embedding: embedding as number[],
    };
  });

  return items.sort((a, b) => a.index - b.index).map((item) => item.embedding);
}

/**
 * Embed a list of texts, batching requests transparently. Requires
 * EMBEDDINGS_API_KEY; the missing-config error surfaces in the Result.
 */
export async function embedTexts(texts: string[]): Promise<Result<number[][]>> {
  return tryCatchAsync(async () => {
    if (texts.length === 0) return [];
    const config = getClient().get();

    const vectors: number[][] = [];
    for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
      const batch = texts.slice(i, i + MAX_BATCH_SIZE);
      const body: Record<string, unknown> = {
        model: config.model,
        input: batch,
      };
      // Only OpenAI's text-embedding-3 family accepts the dimensions param;
      // other providers may reject unknown fields. parseEmbeddingsResponse
      // still enforces the dimensionality either way.
      if (config.model.startsWith("text-embedding-3")) {
        body.dimensions = EMBEDDING_DIMENSIONS;
      }

      const response = await fetch(`${config.baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(
          `Embeddings request failed (${response.status}): ${detail.slice(0, 500)}`,
        );
      }

      vectors.push(
        ...parseEmbeddingsResponse(await response.json(), batch.length),
      );
    }
    return vectors;
  });
}

/** Embed a single text (e.g. a search query). */
export async function embedText(text: string): Promise<Result<number[]>> {
  const result = await embedTexts([text]);
  return map(result, (vectors) => vectors[0]!);
}
