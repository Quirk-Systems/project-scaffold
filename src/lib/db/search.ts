import {
  and,
  cosineDistance,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  isNotNull,
  or,
  sql,
} from "drizzle-orm";

import type { Result } from "@/lib/result";
import { tryCatchAsync } from "@/lib/result";

import { db } from "./index";
import {
  EMBEDDING_DIMENSIONS,
  quirkAnnotations,
  quirkAssets,
  type QuirkAsset,
} from "./schema";

export { EMBEDDING_DIMENSIONS };

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

type AssetType = QuirkAsset["assetType"];
type AssetStatus = QuirkAsset["status"];

export interface SearchAssetsParams {
  /** Free-text fragment matched (case-insensitively) against title and raw text. */
  text?: string;
  /** Restrict to these asset types. */
  assetTypes?: AssetType[];
  /** Restrict to these statuses. */
  statuses?: AssetStatus[];
  /** Restrict to assets carrying a `tag` annotation with one of these labels. */
  tags?: string[];
  /** Query embedding; when present, results are ranked by cosine similarity. */
  embedding?: number[];
  /**
   * Model that produced `embedding`. Required alongside it: ranking is
   * restricted to assets embedded by the same model, because distance between
   * vectors from different models is noise rather than similarity.
   */
  embeddingModel?: string;
  /** Minimum cosine similarity (0..1); only applied when `embedding` is set. */
  minSimilarity?: number;
  /** Page size (clamped to 1..100, default 20). */
  limit?: number;
  /** Rows to skip (default 0). */
  offset?: number;
}

export interface NormalizedSearchParams {
  text?: string;
  assetTypes?: AssetType[];
  statuses?: AssetStatus[];
  tags?: string[];
  embedding?: number[];
  embeddingModel?: string;
  minSimilarity?: number;
  limit: number;
  offset: number;
}

export interface AssetSearchHit {
  asset: QuirkAsset;
  /** Cosine similarity in 0..1 when ranked semantically, otherwise null. */
  similarity: number | null;
}

function clampInt(value: number, min: number, max: number): number {
  return Math.min(Math.max(Math.trunc(value), min), max);
}

function dedupe<T>(values?: T[]): T[] | undefined {
  if (!values || values.length === 0) return undefined;
  const unique = Array.from(new Set(values));
  return unique.length > 0 ? unique : undefined;
}

/**
 * Validate and normalize raw search input into a predictable shape: limits are
 * clamped, text is trimmed, tags are lower-cased and de-duplicated, and an
 * embedding that is the wrong size or carries no model is rejected up front.
 * Pure and database-free so it can be unit-tested in isolation.
 */
export function normalizeSearchParams(
  params: SearchAssetsParams,
): NormalizedSearchParams {
  if (
    params.embedding !== undefined &&
    params.embedding.length !== EMBEDDING_DIMENSIONS
  ) {
    throw new RangeError(
      `embedding must have ${EMBEDDING_DIMENSIONS} dimensions, received ${params.embedding.length}`,
    );
  }

  const embeddingModel = params.embeddingModel?.trim() || undefined;
  if (params.embedding !== undefined && embeddingModel === undefined) {
    throw new TypeError(
      "embeddingModel is required when embedding is supplied: similarity is only meaningful within one embedding space",
    );
  }

  const text = params.text?.trim() || undefined;

  const tags = params.tags
    ? dedupe(params.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))
    : undefined;

  const minSimilarity =
    params.minSimilarity === undefined
      ? undefined
      : Math.min(Math.max(params.minSimilarity, 0), 1);

  return {
    text,
    assetTypes: dedupe(params.assetTypes),
    statuses: dedupe(params.statuses),
    tags,
    embedding: params.embedding,
    embeddingModel,
    minSimilarity,
    limit: clampInt(params.limit ?? DEFAULT_LIMIT, 1, MAX_LIMIT),
    offset: Math.max(0, Math.trunc(params.offset ?? 0)),
  };
}

/** Escape LIKE/ILIKE wildcards so user text is matched literally. */
function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * Search the asset registry by any combination of semantic similarity, free
 * text, type/status, and tags. When `embedding` is supplied, only assets
 * embedded by the same `embeddingModel` are returned and rows are ordered by
 * descending cosine similarity; otherwise the newest matching assets come
 * first.
 */
export async function searchAssets(
  params: SearchAssetsParams,
): Promise<Result<AssetSearchHit[]>> {
  return tryCatchAsync(async () => {
    const p = normalizeSearchParams(params);

    const similarity = p.embedding
      ? sql<number>`1 - (${cosineDistance(quirkAssets.embedding, p.embedding)})`
      : null;

    const conditions = [];

    if (p.text) {
      const pattern = `%${escapeLike(p.text)}%`;
      conditions.push(
        or(
          ilike(quirkAssets.title, pattern),
          ilike(quirkAssets.rawText, pattern),
        ),
      );
    }

    if (p.assetTypes) {
      conditions.push(inArray(quirkAssets.assetType, p.assetTypes));
    }

    if (p.statuses) {
      conditions.push(inArray(quirkAssets.status, p.statuses));
    }

    if (p.tags) {
      const taggedAssetIds = db
        .select({ id: quirkAnnotations.assetId })
        .from(quirkAnnotations)
        .where(
          and(
            eq(quirkAnnotations.annotationType, "tag"),
            inArray(sql`lower(${quirkAnnotations.label})`, p.tags),
          ),
        );
      conditions.push(inArray(quirkAssets.id, taggedAssetIds));
    }

    if (similarity) {
      conditions.push(isNotNull(quirkAssets.embedding));
      // Compare like with like: rows embedded by a different model (or by an
      // unknown one) are excluded rather than ranked against a foreign space.
      conditions.push(eq(quirkAssets.embeddingModel, p.embeddingModel!));
      if (p.minSimilarity !== undefined) {
        conditions.push(gt(similarity, p.minSimilarity));
      }
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({ asset: quirkAssets, similarity: similarity ?? sql<null>`null` })
      .from(quirkAssets)
      .where(where)
      .orderBy(similarity ? desc(similarity) : desc(quirkAssets.createdAt))
      .limit(p.limit)
      .offset(p.offset);

    return rows.map((row) => ({
      asset: row.asset,
      similarity: row.similarity === null ? null : Number(row.similarity),
    }));
  });
}
