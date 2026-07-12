import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  quirkAnnotations,
  quirkAssets,
  type QuirkAnnotation,
  type NewQuirkAnnotation,
} from "@/lib/db/schema";
import { curatorPropose, type ProposedAnnotation } from "./agents";
import { getAsset } from "./assets";

export async function listAnnotations(
  assetId: string,
): Promise<QuirkAnnotation[]> {
  return db
    .select()
    .from(quirkAnnotations)
    .where(eq(quirkAnnotations.assetId, assetId))
    .orderBy(desc(quirkAnnotations.createdAt));
}

/**
 * Curator Imp proposal pass — reads the asset and suggests annotations without
 * persisting them. The UI lets a human approve/edit/reject before saving.
 */
export async function proposeAnnotations(
  assetId: string,
): Promise<ProposedAnnotation[] | null> {
  const found = await getAsset(assetId);
  if (!found) return null;
  return curatorPropose({
    rawText: found.asset.rawText,
    assetType: found.asset.assetType,
  });
}

export async function saveAnnotations(
  assetId: string,
  annotator: string,
  annotations: ProposedAnnotation[],
): Promise<QuirkAnnotation[]> {
  if (annotations.length === 0) return [];

  const rows: NewQuirkAnnotation[] = annotations.map((a) => ({
    assetId,
    annotator,
    annotationType: a.annotationType,
    label: a.label,
    value: a.value,
    confidence: a.confidence,
  }));

  const inserted = await db.insert(quirkAnnotations).values(rows).returning();

  // Promote a freshly-captured asset into the annotated lifecycle stage,
  // without clobbering assets that have already advanced further.
  await db
    .update(quirkAssets)
    .set({ status: "annotated", updatedAt: new Date() })
    .where(
      and(eq(quirkAssets.id, assetId), eq(quirkAssets.status, "captured")),
    );

  return inserted;
}
