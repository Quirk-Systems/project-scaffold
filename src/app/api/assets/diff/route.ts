import { NextResponse } from "next/server";
import { z } from "zod";
import { createDiff } from "@/lib/quirk/diffs";
import { notFound, parseBody, serverError } from "@/lib/quirk/http";

export const dynamic = "force-dynamic";

const diffSchema = z.object({
  assetId: z.string().uuid(),
  fromVersionId: z.string().uuid(),
  toVersionId: z.string().uuid(),
});

export async function POST(request: Request) {
  const parsed = await parseBody(request, diffSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const diff = await createDiff(parsed.data);
    if (!diff) return notFound("Versions not found for this asset");
    return NextResponse.json({ diff }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
