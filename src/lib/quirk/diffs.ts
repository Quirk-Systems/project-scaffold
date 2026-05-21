import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  quirkDiffs,
  quirkAssetVersions,
  type QuirkDiff,
} from "@/lib/db/schema";
import { diffWitchCompare } from "./agents";
import { versionText } from "./assets";

export async function listDiffs(assetId: string): Promise<QuirkDiff[]> {
  return db
    .select()
    .from(quirkDiffs)
    .where(eq(quirkDiffs.assetId, assetId))
    .orderBy(desc(quirkDiffs.createdAt));
}

/**
 * Diff Witch entrypoint: load two versions, compute the semantic diff, and
 * persist it for the ledger / SemanticDiffViewer.
 */
export async function createDiff(input: {
  assetId: string;
  fromVersionId: string;
  toVersionId: string;
}): Promise<QuirkDiff | null> {
  const versions = await db
    .select()
    .from(quirkAssetVersions)
    .where(eq(quirkAssetVersions.assetId, input.assetId));

  const from = versions.find((v) => v.id === input.fromVersionId);
  const to = versions.find((v) => v.id === input.toVersionId);
  if (!from || !to) return null;

  const result = diffWitchCompare({
    fromText: versionText(from),
    toText: versionText(to),
  });

  const [diff] = await db
    .insert(quirkDiffs)
    .values({
      assetId: input.assetId,
      fromVersionId: from.id,
      toVersionId: to.id,
      diffType: "semantic",
      summary: result.summary,
      additions: result.additions,
      removals: result.removals,
      meaningShift: result.meaningShift,
      scoreDelta: result.scoreDelta,
    })
    .returning();

  return diff;
}
