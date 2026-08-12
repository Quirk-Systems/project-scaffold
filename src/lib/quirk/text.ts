import { assetTypeEnum, type QuirkAsset } from "@/lib/db/schema";

export type AssetType = QuirkAsset["assetType"];

const URL_RE = /^https?:\/\/\S+$/i;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|svg|bmp)(\?|#|$)/i;
const AUDIO_EXT = /\.(mp3|wav|flac|aac|ogg|m4a)(\?|#|$)/i;
const VIDEO_EXT = /\.(mp4|mov|webm|mkv|avi)(\?|#|$)/i;
const PDF_EXT = /\.pdf(\?|#|$)/i;

/**
 * Detect the most likely asset type from the available signals. Order matters:
 * an explicit hint always wins, then file extensions, then content shape.
 */
export function detectAssetType(input: {
  hint?: string | null;
  sourceUrl?: string | null;
  storagePath?: string | null;
  rawText?: string | null;
}): AssetType {
  const hinted = assetTypeEnum.enumValues.find((t) => t === input.hint);
  if (hinted) return hinted;

  const path = `${input.sourceUrl ?? ""} ${input.storagePath ?? ""}`;
  if (PDF_EXT.test(path)) return "pdf";
  if (IMAGE_EXT.test(path)) return "image";
  if (AUDIO_EXT.test(path)) return "audio";
  if (VIDEO_EXT.test(path)) return "video";

  const text = (input.rawText ?? "").trim();
  if (input.sourceUrl && URL_RE.test(input.sourceUrl)) return "web_clip";
  if (looksLikeDataset(text)) return "dataset";
  if (looksLikeSong(text)) return "song";
  if (looksLikePrompt(text)) return "prompt";
  if (text) return "text";
  return "other";
}

function looksLikeDataset(text: string): boolean {
  if (!text) return false;
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return false;
  const commaCounts = lines.slice(0, 5).map((l) => l.split(",").length);
  const first = commaCounts[0];
  return first > 1 && commaCounts.every((c) => c === first);
}

function looksLikeSong(text: string): boolean {
  return /\[(verse|chorus|bridge|hook|intro|outro)\b/i.test(text);
}

function looksLikePrompt(text: string): boolean {
  return /\b(you are|act as|system prompt|respond as|your task is)\b/i.test(
    text,
  );
}

/** Pull a short, human-friendly title out of raw text. */
export function deriveTitle(
  rawText?: string | null,
  fallback?: string | null,
): string {
  const text = (rawText ?? "").trim();
  if (text) {
    const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0);
    if (firstLine) {
      const clean = firstLine.replace(/^[#>\-*\s]+/, "").trim();
      return truncate(clean, 80);
    }
  }
  if (fallback) return truncate(fallback, 80);
  return "Untitled scrap";
}

export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "of",
  "to",
  "in",
  "on",
  "for",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "it",
  "this",
  "that",
  "with",
  "as",
  "at",
  "by",
  "from",
  "i",
  "you",
  "we",
  "they",
  "he",
  "she",
  "my",
  "your",
]);

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9']+/g) ?? []).filter(
    (w) => w.length > 1,
  );
}

export function contentWords(text: string): string[] {
  return tokenize(text).filter((w) => !STOP_WORDS.has(w));
}

export function wordCount(text: string): number {
  return tokenize(text).length;
}

/** Normalize loose user metadata into a flat record of primitive values. */
export function normalizeMetadata(
  input: Record<string, unknown> | undefined | null,
): Record<string, unknown> {
  if (!input || typeof input !== "object") return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === null || value === undefined) continue;
    const cleanKey = key.trim().toLowerCase().replace(/\s+/g, "_");
    if (!cleanKey) continue;
    out[cleanKey] = value;
  }
  return out;
}
