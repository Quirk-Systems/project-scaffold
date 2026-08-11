import { NextResponse } from "next/server";
import { publishAsset } from "@/lib/quirk/assets";
import { notFound, serverError } from "@/lib/quirk/http";

export const dynamic = "force-dynamic";

/**
 * Advance an asset from `approved` → `published`.
 * Only assets already in `approved` status are eligible; the status check
 * is enforced atomically in the domain layer.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const asset = await publishAsset(id);
    if (!asset) return notFound("Asset not found or not in approved status");
    return NextResponse.json({ asset }, { status: 200 });
  } catch (e) {
    return serverError(e);
  }
}
