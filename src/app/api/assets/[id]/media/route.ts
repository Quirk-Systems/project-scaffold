import { NextResponse } from "next/server";
import { getAsset } from "@/lib/quirk/assets";
import { getMediaUrl } from "@/lib/quirk/media";
import { notFound, serverError } from "@/lib/quirk/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Serve an asset's stored media by 302-redirecting to a short-lived signed
// URL. Keeps the bucket private while making visual assets viewable anywhere
// an <img src> can point.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const result = await getAsset(id);
    if (!result?.asset?.storagePath) {
      return notFound("Asset has no stored media");
    }
    const url = await getMediaUrl(result.asset.storagePath);
    return NextResponse.redirect(url, 302);
  } catch (e) {
    return serverError(e);
  }
}
