import { NextRequest, NextResponse } from "next/server";
import { searchAssets } from "@/lib/db/search";
import { serverError } from "@/lib/quirk/http";
import { parseSearchParams } from "./params";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const result = await searchAssets(
    parseSearchParams(request.nextUrl.searchParams),
  );
  if (!result.ok) return serverError(result.error);
  return NextResponse.json({ hits: result.value });
}
