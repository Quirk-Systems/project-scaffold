import { NextRequest, NextResponse } from "next/server";
import { listAssets, type AssetStatus } from "@/lib/quirk/assets";
import { serverError } from "@/lib/quirk/http";

export const dynamic = "force-dynamic";

const STATUSES: AssetStatus[] = [
  "captured",
  "annotated",
  "mutated",
  "approved",
  "published",
  "rejected",
];

export async function GET(request: NextRequest) {
  try {
    const statusParam = request.nextUrl.searchParams.get("status");
    const q = request.nextUrl.searchParams.get("q") ?? undefined;
    const status =
      statusParam && STATUSES.includes(statusParam as AssetStatus)
        ? (statusParam as AssetStatus)
        : undefined;
    const assets = await listAssets(status, q);
    return NextResponse.json({ assets });
  } catch (e) {
    return serverError(e);
  }
}
