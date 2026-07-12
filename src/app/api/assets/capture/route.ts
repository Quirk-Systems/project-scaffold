import { NextResponse } from "next/server";
import { z } from "zod";
import { captureAsset } from "@/lib/quirk/assets";
import { parseBody, serverError } from "@/lib/quirk/http";

export const dynamic = "force-dynamic";

const captureSchema = z
  .object({
    title: z.string().optional(),
    assetType: z.string().optional(),
    sourceUrl: z.string().url().optional(),
    storagePath: z.string().optional(),
    rawText: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .refine((v) => v.rawText || v.sourceUrl || v.storagePath, {
    message: "Provide at least one of rawText, sourceUrl, or storagePath",
  });

export async function POST(request: Request) {
  const parsed = await parseBody(request, captureSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const { asset, version } = await captureAsset(parsed.data);
    return NextResponse.json({ asset, version }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
