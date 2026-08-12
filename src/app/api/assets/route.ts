import { NextRequest, NextResponse } from "next/server";
import { listAssets } from "@/lib/quirk/assets";
import { serverError } from "@/lib/quirk/http";
import { assetStatusEnum } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const STATUSES = assetStatusEnum.enumValues;

export async function GET(request: NextRequest) {
  try {
    const statusParam = request.nextUrl.searchParams.get("status");
    const status = STATUSES.find((s) => s === statusParam);
    const assets = await listAssets(status);
    return NextResponse.json({ assets });
  } catch (e) {
    return serverError(e);
  }
}
