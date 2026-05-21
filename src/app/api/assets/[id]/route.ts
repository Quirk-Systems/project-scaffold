import { NextResponse } from "next/server";
import { getAsset } from "@/lib/quirk/assets";
import { listAnnotations } from "@/lib/quirk/annotations";
import { listDiffs } from "@/lib/quirk/diffs";
import { notFound, serverError } from "@/lib/quirk/http";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const found = await getAsset(id);
    if (!found) return notFound("Asset not found");

    const [annotations, diffs] = await Promise.all([
      listAnnotations(id),
      listDiffs(id),
    ]);

    return NextResponse.json({
      asset: found.asset,
      versions: found.versions,
      annotations,
      diffs,
    });
  } catch (e) {
    return serverError(e);
  }
}
