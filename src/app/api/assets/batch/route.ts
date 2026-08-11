import { NextResponse } from "next/server";
import { z } from "zod";
import { captureAsset } from "@/lib/quirk/assets";
import { parseBody, serverError } from "@/lib/quirk/http";

export const dynamic = "force-dynamic";

const itemSchema = z
  .object({
    title: z.string().optional(),
    assetType: z.string().optional(),
    sourceUrl: z.string().url().optional(),
    storagePath: z.string().optional(),
    rawText: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .refine((v) => v.rawText || v.sourceUrl || v.storagePath, {
    message: "Each item needs at least one of rawText, sourceUrl, or storagePath",
  });

const batchSchema = z.object({
  items: z.array(itemSchema).min(1).max(50),
});

/**
 * Batch ingest — Archivist Goblin fans out capture + embedding in parallel.
 * Accepts 1–50 items. Each item is independent; failures are collected and
 * returned alongside successful captures without aborting the batch.
 */
export async function POST(request: Request) {
  const parsed = await parseBody(request, batchSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const results = await Promise.allSettled(
      parsed.data.items.map((item) => captureAsset(item)),
    );

    const captured: { asset: object; version: object }[] = [];
    const errors: { index: number; error: string }[] = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        captured.push({ asset: result.value.asset, version: result.value.version });
      } else {
        const msg =
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason);
        errors.push({ index, error: msg });
      }
    });

    const status = errors.length === parsed.data.items.length ? 400 : 201;
    return NextResponse.json({ captured, errors }, { status });
  } catch (e) {
    return serverError(e);
  }
}
