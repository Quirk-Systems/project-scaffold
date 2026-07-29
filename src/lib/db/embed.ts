import { and, asc, count, eq, isNull, sql } from "drizzle-orm";

import {
  buildAssetEmbeddingInput,
  embedText,
  embedTexts,
} from "@/lib/ai/embeddings";
import type { Result } from "@/lib/result";
import { tryCatchAsync, unwrap } from "@/lib/result";

import { db } from "./index";
import { quirkAssets } from "./schema";
import {
  searchAssets,
  type AssetSearchHit,
  type SearchAssetsParams,
} from "./search";

const DEFAULT_BATCH_SIZE = 50;
const MAX_BATCH_SIZE = 100;

// Pending = no embedding yet AND some non-blank text to embed. The text
// condition mirrors buildAssetEmbeddingInput so textless rows are never
// selected (they would otherwise be re-fetched forever by the backfill loop).
const pendingCondition = and(
  isNull(quirkAssets.embedding),
  sql`(trim(coalesce(${quirkAssets.title}, '')) <> '' or trim(coalesce(${quirkAssets.rawText}, '')) <> '')`,
);

export interface EmbedPendingResult {
  /** Assets embedded in this batch. */
  embedded: number;
  /** Embeddable assets still pending after this batch. */
  remaining: number;
}

/**
 * Populate `quirk_assets.embedding` for one batch of assets that don't have
 * one yet. Call repeatedly (see `scripts/embed-assets.ts`) until `remaining`
 * is 0. Requires EMBEDDINGS_API_KEY.
 */
export async function embedPendingAssets(
  options: { batchSize?: number } = {},
): Promise<Result<EmbedPendingResult>> {
  return tryCatchAsync(async () => {
    const batchSize = Math.min(
      Math.max(Math.trunc(options.batchSize ?? DEFAULT_BATCH_SIZE), 1),
      MAX_BATCH_SIZE,
    );

    const batch = await db
      .select({
        id: quirkAssets.id,
        title: quirkAssets.title,
        rawText: quirkAssets.rawText,
      })
      .from(quirkAssets)
      .where(pendingCondition)
      .orderBy(asc(quirkAssets.createdAt))
      .limit(batchSize);

    // The SQL condition guarantees embeddable text, but keep the pure check
    // as the single source of truth for what actually gets embedded.
    const embeddable = batch.flatMap((row) => {
      const input = buildAssetEmbeddingInput(row);
      return input === null ? [] : [{ id: row.id, input }];
    });

    if (embeddable.length > 0) {
      const vectors = unwrap(
        await embedTexts(embeddable.map((row) => row.input)),
      );
      for (const [position, row] of embeddable.entries()) {
        await db
          .update(quirkAssets)
          .set({ embedding: vectors[position], updatedAt: new Date() })
          .where(eq(quirkAssets.id, row.id));
      }
    }

    const [pending] = await db
      .select({ value: count() })
      .from(quirkAssets)
      .where(pendingCondition);

    return {
      embedded: embeddable.length,
      remaining: pending?.value ?? 0,
    };
  });
}

export type SemanticSearchParams = Omit<SearchAssetsParams, "embedding">;

/**
 * Search assets by natural-language query: embeds the query text, then ranks
 * via `searchAssets()` cosine similarity. All non-embedding filters (text,
 * types, statuses, tags, pagination) pass through unchanged.
 */
export async function semanticSearchAssets(
  query: string,
  params: SemanticSearchParams = {},
): Promise<Result<AssetSearchHit[]>> {
  const embedded = await embedText(query);
  if (!embedded.ok) return embedded;
  return searchAssets({ ...params, embedding: embedded.value });
}
