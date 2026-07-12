import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  quirkAssets,
  quirkAssetVersions,
  quirkAnnotations,
  type QuirkAsset,
  type QuirkAssetVersion,
} from "@/lib/db/schema";
import { archivistIngest, type IngestInput } from "./agents";
import { embedText } from "./embeddings";

export type AssetStatus = QuirkAsset["status"];

export type AssetSummary = QuirkAsset & {
  versionCount: number;
  annotationCount: number;
};

/**
 * Archivist Goblin entrypoint: ingest a messy input, persist the canonical
 * asset row, embed it, and write version 1.
 */
export async function captureAsset(input: IngestInput): Promise<{
  asset: QuirkAsset;
  version: QuirkAssetVersion;
}> {
  const ingest = archivistIngest(input);
  const embedding = ingest.rawText ? embedText(ingest.rawText) : null;

  return db.transaction(async (tx) => {
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
}

export async function listAssets(
  filter?: AssetStatus,
): Promise<AssetSummary[]> {
  const assets = await db
    .select()
    .from(quirkAssets)
    .where(filter ? eq(quirkAssets.status, filter) : undefined)
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
 */
export async function mutateAsset(
  id: string,
  input: { rawText: string; changeSummary?: string; createdBy?: string },
): Promise<QuirkAssetVersion | null> {
  return db.transaction(async (tx) => {
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

    const [version] = await tx
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

    return version;
  });
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

export function versionText(v: QuirkAssetVersion | undefined): string | null {
  if (!v) return null;
  const raw = (v.contentSnapshot as { rawText?: unknown }).rawText;
  return typeof raw === "string" ? raw : null;
}
