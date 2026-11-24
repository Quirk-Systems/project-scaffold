import { and, asc, count, eq, isNull, or, sql } from "drizzle-orm";

import {
  buildAssetEmbeddingInput,
  embedText,
  embedTexts,
  getConfiguredEmbeddingModel,
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

/**
 * Pending = some non-blank text to embed, AND either no embedding at all or
 * one from a different model. The model clause is what lets this repair rows
 * written by the offline hash fallback (or by a previously configured
 * provider): keying only on NULL would skip them forever, since they already
 * hold a vector. The text clause mirrors buildAssetEmbeddingInput so textless
 * rows are never selected — they would otherwise be re-fetched forever by the
 * backfill loop.
 */
function pendingCondition(model: string) {
  return and(
    or(
      isNull(quirkAssets.embedding),
      sql`${quirkAssets.embeddingModel} is distinct from ${model}`,
    ),
    sql`(trim(coalesce(${quirkAssets.title}, '')) <> '' or trim(coalesce(${quirkAssets.rawText}, '')) <> '')`,
  );
}

export interface EmbedPendingResult {
  /** Assets embedded in this batch. */
  embedded: number;
  /** Embeddable assets still pending after this batch. */
  remaining: number;
}

/**
 * Populate `quirk_assets.embedding` for one batch of assets that are missing a
 * vector from the configured model — including rows carrying a vector from a
 * different model, which are re-embedded in place. Call repeatedly (see
 * `scripts/embed-assets.ts`) until `remaining` is 0. Requires
 * EMBEDDINGS_API_KEY.
 */
export async function embedPendingAssets(
  options: { batchSize?: number } = {},
): Promise<Result<EmbedPendingResult>> {
  return tryCatchAsync(async () => {
    const batchSize = Math.min(
      Math.max(Math.trunc(options.batchSize ?? DEFAULT_BATCH_SIZE), 1),
      MAX_BATCH_SIZE,
    );
    const model = getConfiguredEmbeddingModel();
    const pendingWhere = pendingCondition(model);

    const batch = await db
      .select({
        id: quirkAssets.id,
        title: quirkAssets.title,
        rawText: quirkAssets.rawText,
        embeddingModel: quirkAssets.embeddingModel,
      })
      .from(quirkAssets)
      .where(pendingWhere)
      .orderBy(asc(quirkAssets.createdAt))
      .limit(batchSize);

    // The SQL condition guarantees embeddable text, but keep the pure check
    // as the single source of truth for what actually gets embedded.
    const embeddable = batch.flatMap((row) => {
      const input = buildAssetEmbeddingInput(row);
      return input === null ? [] : [{ ...row, input }];
    });

    let embedded = 0;
    if (embeddable.length > 0) {
      const vectors = unwrap(
        await embedTexts(embeddable.map((row) => row.input)),
      );
      for (const [position, row] of embeddable.entries()) {
        const written = await db
          .update(quirkAssets)
          .set({
            embedding: vectors[position],
            embeddingModel: model,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(quirkAssets.id, row.id),
              pendingWhere,
              // Reject a stale result if its source or model tag changed
              // while the provider request was in flight.
              sql`${quirkAssets.title} is not distinct from ${row.title}`,
              sql`${quirkAssets.rawText} is not distinct from ${row.rawText}`,
              sql`${quirkAssets.embeddingModel} is not distinct from ${row.embeddingModel}`,
            ),
          )
          .returning({ id: quirkAssets.id });
        embedded += written.length;
      }
    }

    const [pending] = await db
      .select({ value: count() })
      .from(quirkAssets)
      .where(pendingWhere);

    return {
      embedded,
      remaining: pending?.value ?? 0,
    };
  });
}

export type SemanticSearchParams = Omit<
  SearchAssetsParams,
  "embedding" | "embeddingModel"
>;

/**
 * Search assets by natural-language query: embeds the query text, then ranks
 * via `searchAssets()` cosine similarity. All non-embedding filters (text,
 * types, statuses, tags, pagination) pass through unchanged.
 *
 * Only assets embedded by the configured model are ranked. Rows still holding
 * a vector from another embedder are skipped until `embedPendingAssets()`
 * re-embeds them, which is the safe direction: a missing result beats a result
 * ordered by a meaningless distance.
 */
export async function semanticSearchAssets(
  query: string,
  params: SemanticSearchParams = {},
): Promise<Result<AssetSearchHit[]>> {
  const embedded = await embedText(query);
  if (!embedded.ok) return embedded;
  return searchAssets({
    ...params,
    embedding: embedded.value,
    embeddingModel: getConfiguredEmbeddingModel(),
  });
}
