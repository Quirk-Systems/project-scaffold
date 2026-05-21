import {
  deriveTitle,
  detectAssetType,
  normalizeMetadata,
  wordCount,
} from "../text";
import type { IngestResult } from "./types";

export type IngestInput = {
  title?: string | null;
  assetType?: string | null;
  sourceUrl?: string | null;
  storagePath?: string | null;
  rawText?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Archivist Goblin — ingests messy unstructured material, normalizes its
 * metadata, extracts usable text, assigns a type, and builds the v1 snapshot
 * that everything downstream versions against.
 */
export function archivistIngest(input: IngestInput): IngestResult {
  const rawText = cleanText(input.rawText);
  const assetType = detectAssetType({
    hint: input.assetType,
    sourceUrl: input.sourceUrl,
    storagePath: input.storagePath,
    rawText,
  });
  const title = input.title?.trim()
    ? input.title.trim()
    : deriveTitle(rawText, input.sourceUrl);

  const metadata = {
    ...normalizeMetadata(input.metadata),
    ingested_by: "archivist_goblin",
    detected_type: assetType,
    word_count: rawText ? wordCount(rawText) : 0,
    has_source: Boolean(input.sourceUrl),
    captured_at: new Date().toISOString(),
  };

  const snapshot: Record<string, unknown> = {
    title,
    assetType,
    rawText,
    sourceUrl: input.sourceUrl ?? null,
    storagePath: input.storagePath ?? null,
    metadata,
  };

  return { title, assetType, rawText, metadata, snapshot };
}

function cleanText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
  return trimmed.length > 0 ? trimmed : null;
}
