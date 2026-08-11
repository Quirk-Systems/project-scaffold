import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  quirkAssets,
  quirkAssetVersions,
  quirkAnnotations,
  type QuirkAsset,
  type QuirkAssetVersion,
} from "@/lib/db/schema";
import { archivistIngest, curatorPropose, type IngestInput } from "./agents";
import { embedText } from "./embeddings";

export type AssetStatus = QuirkAsset["status"];

export type AssetSummary = QuirkAsset & {
  versionCount: number;
  annotationCount: number;
};

/**
 * Archivist Goblin entrypoint: ingest a messy input, persist the canonical
 * asset row, embed it, and write version 1. After committing, fires
 * Curator auto-annotation best-effort (never blocks the caller).
 */
export async function captureAsset(input: IngestInput): Promise<{
  asset: QuirkAsset;
  version: QuirkAssetVersion;
}> {
  const ingest = archivistIngest(input);
  const embedding = ingest.rawText ? embedText(ingest.rawText) : null;

  const result = await db.transaction(async (tx) => {
    const [asset] = await tx
      .insert(quirkAssets)
      .values({
        title: ingest.title,
        assetType: ingest.assetType,
        sourceUrl: input.sourceUrl ?? null,
        storagePath: input.storagePath ?? null,
        rawText: ingest.rawText,
        metadata: ingest.metadata,
        embedding,
        status: "captured",
      })
      .returning();

    const [version] = await tx
      .insert(quirkAssetVersions)
      .values({
        assetId: asset.id,
        versionNumber: 1,
        changeSummary: "Initial capture by Archivist Goblin",
        contentSnapshot: ingest.snapshot,
        createdBy: "archivist_goblin",
      })
      .returning();

    return { asset, version };
  });

  // Fire Curator auto-annotation after the transaction commits.
  // Best-effort: a failure here must never surface to the caller.
  autoAnnotate(result.asset).catch((e) =>
    console.warn(`[quirk] auto-annotation failed for asset ${result.asset.id}:`, e),
  );

  return result;
}

export async function listAssets(
  filter?: AssetStatus,
  q?: string,
): Promise<AssetSummary[]> {
  const searchClause = q
    ? or(ilike(quirkAssets.title, `%${q}%`), ilike(quirkAssets.rawText, `%${q}%`))
    : undefined;
  const statusClause = filter ? eq(quirkAssets.status, filter) : undefined;

  const assets = await db
    .select()
    .from(quirkAssets)
    .where(and(statusClause, searchClause))
    .orderBy(desc(quirkAssets.createdAt));

  if (assets.length === 0) return [];
  const ids = assets.map((a) => a.id);

  const versionCounts = await db
    .select({
      assetId: quirkAssetVersions.assetId,
      n: sql<number>`count(*)::int`,
    })
    .from(quirkAssetVersions)
    .where(inArray(quirkAssetVersions.assetId, ids))
    .groupBy(quirkAssetVersions.assetId);

  const annotationCounts = await db
    .select({
      assetId: quirkAnnotations.assetId,
      n: sql<number>`count(*)::int`,
    })
    .from(quirkAnnotations)
    .where(inArray(quirkAnnotations.assetId, ids))
    .groupBy(quirkAnnotations.assetId);

  const vMap = new Map(versionCounts.map((r) => [r.assetId, r.n]));
  const aMap = new Map(annotationCounts.map((r) => [r.assetId, r.n]));

  return assets.map((a) => ({
    ...a,
    versionCount: vMap.get(a.id) ?? 0,
    annotationCount: aMap.get(a.id) ?? 0,
  }));
}

export async function getAsset(id: string): Promise<{
  asset: QuirkAsset;
  versions: QuirkAssetVersion[];
} | null> {
  const [asset] = await db
    .select()
    .from(quirkAssets)
    .where(eq(quirkAssets.id, id))
    .limit(1);
  if (!asset) return null;

  const versions = await db
    .select()
    .from(quirkAssetVersions)
    .where(eq(quirkAssetVersions.assetId, id))
    .orderBy(desc(quirkAssetVersions.versionNumber));

  return { asset, versions };
}

/**
 * Create the next version of an asset (a "mutation") and re-embed it.
 * Fires Curator re-annotation best-effort after the transaction commits.
 */
export async function mutateAsset(
  id: string,
  input: { rawText: string; changeSummary?: string; createdBy?: string },
): Promise<QuirkAssetVersion | null> {
  const version = await db.transaction(async (tx) => {
    const [asset] = await tx
      .select()
      .from(quirkAssets)
      .where(eq(quirkAssets.id, id))
      .limit(1);
    if (!asset) return null;

    const [{ max }] = await tx
      .select({
        max: sql<number>`coalesce(max(${quirkAssetVersions.versionNumber}), 0)::int`,
      })
      .from(quirkAssetVersions)
      .where(eq(quirkAssetVersions.assetId, id));

    const nextNumber = (max ?? 0) + 1;
    const snapshot = {
      title: asset.title,
      assetType: asset.assetType,
      rawText: input.rawText,
      sourceUrl: asset.sourceUrl,
      storagePath: asset.storagePath,
      metadata: asset.metadata,
    };

    const [v] = await tx
      .insert(quirkAssetVersions)
      .values({
        assetId: id,
        versionNumber: nextNumber,
        changeSummary: input.changeSummary ?? `Mutation v${nextNumber}`,
        contentSnapshot: snapshot,
        createdBy: input.createdBy ?? "system",
      })
      .returning();

    await tx
      .update(quirkAssets)
      .set({
        rawText: input.rawText,
        embedding: embedText(input.rawText),
        status: "mutated",
        updatedAt: new Date(),
      })
      .where(eq(quirkAssets.id, id));

    return v;
  });

  // Re-annotate after the mutation transaction commits.
  if (version) {
    const [updated] = await db
      .select()
      .from(quirkAssets)
      .where(eq(quirkAssets.id, id))
      .limit(1);
    if (updated) {
      autoAnnotate(updated).catch((e) =>
        console.warn(`[quirk] re-annotation failed for asset ${id}:`, e),
      );
    }
  }

  return version;
}

export async function setAssetStatus(
  id: string,
  status: AssetStatus,
): Promise<void> {
  await db
    .update(quirkAssets)
    .set({ status, updatedAt: new Date() })
    .where(eq(quirkAssets.id, id));
}

/**
 * Advance an asset to `published`. Only assets in `approved` status may be
 * published; this enforces the curation gate.
 *
 * Returns the updated asset, or null if the asset is not found or not in
 * `approved` status.
 */
export async function publishAsset(id: string): Promise<QuirkAsset | null> {
  const [updated] = await db
    .update(quirkAssets)
    .set({ status: "published", updatedAt: new Date() })
    .where(and(eq(quirkAssets.id, id), eq(quirkAssets.status, "approved")))
    .returning();
  return updated ?? null;
}

/**
 * List published assets, joined with their quality annotation score so
 * callers can rank them. Returns summaries ordered by quality desc then
 * creation date desc.
 */
export async function listPublishedAssets(): Promise<
  (AssetSummary & { qualityScore: number })[]
> {
  const assets = await db
    .select()
    .from(quirkAssets)
    .where(eq(quirkAssets.status, "published"));

  if (assets.length === 0) return [];
  const ids = assets.map((a) => a.id);

  const [versionCounts, annotationCounts, qualityAnnotations] =
    await Promise.all([
      db
        .select({
          assetId: quirkAssetVersions.assetId,
          n: sql<number>`count(*)::int`,
        })
        .from(quirkAssetVersions)
        .where(inArray(quirkAssetVersions.assetId, ids))
        .groupBy(quirkAssetVersions.assetId),
      db
        .select({
          assetId: quirkAnnotations.assetId,
          n: sql<number>`count(*)::int`,
        })
        .from(quirkAnnotations)
        .where(inArray(quirkAnnotations.assetId, ids))
        .groupBy(quirkAnnotations.assetId),
      // Pull the latest quality annotation score per asset.
      db
        .select({
          assetId: quirkAnnotations.assetId,
          value: quirkAnnotations.value,
        })
        .from(quirkAnnotations)
        .where(
          and(
            inArray(quirkAnnotations.assetId, ids),
            eq(quirkAnnotations.annotationType, "quality"),
          ),
        )
        .orderBy(desc(quirkAnnotations.createdAt)),
    ]);

  const vMap = new Map(versionCounts.map((r) => [r.assetId, r.n]));
  const aMap = new Map(annotationCounts.map((r) => [r.assetId, r.n]));

  // Use the most recent quality annotation's scores.quality value.
  const qMap = new Map<string, number>();
  for (const row of qualityAnnotations) {
    if (!qMap.has(row.assetId)) {
      const val = row.value as { scores?: { quality?: number } };
      qMap.set(row.assetId, val?.scores?.quality ?? 0);
    }
  }

  const summaries = assets.map((a) => ({
    ...a,
    versionCount: vMap.get(a.id) ?? 0,
    annotationCount: aMap.get(a.id) ?? 0,
    qualityScore: qMap.get(a.id) ?? 0,
  }));

  // Sort by quality desc, then by creation date desc as tiebreaker.
  summaries.sort((a, b) =>
    b.qualityScore !== a.qualityScore
      ? b.qualityScore - a.qualityScore
      : b.createdAt.getTime() - a.createdAt.getTime(),
  );

  return summaries;
}

export function versionText(v: QuirkAssetVersion | undefined): string | null {
  if (!v) return null;
  const raw = (v.contentSnapshot as { rawText?: unknown }).rawText;
  return typeof raw === "string" ? raw : null;
}

/**
 * Internal: run the Curator annotation pass on an asset and persist the
 * results. Called after capture and mutation. Pure side-effect; callers
 * must catch errors themselves.
 *
 * Uses a dynamic import for `./annotations` to avoid the circular reference
 * that would arise from `annotations.ts` statically importing `getAsset`.
 */
async function autoAnnotate(asset: QuirkAsset): Promise<void> {
  const proposals = curatorPropose({
    rawText: asset.rawText,
    assetType: asset.assetType,
  });
  if (proposals.length > 0) {
    const { saveAnnotations } = await import("./annotations");
    await saveAnnotations(asset.id, "curator", proposals);
  }
}
