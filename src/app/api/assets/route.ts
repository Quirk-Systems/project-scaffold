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
    const status =
      statusParam && STATUSES.includes(statusParam as AssetStatus)
        ? (statusParam as AssetStatus)
        : undefined;
    const assets = await listAssets(status);
    return NextResponse.json({ assets });
  } catch (e) {
    return serverError(e);
  }
}
