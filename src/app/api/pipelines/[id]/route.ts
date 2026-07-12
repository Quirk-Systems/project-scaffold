import { NextResponse } from "next/server";
import { getPipeline } from "@/lib/quirk/pipelines";
import { notFound, serverError } from "@/lib/quirk/http";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const found = await getPipeline(id);
    if (!found) return notFound("Pipeline not found");
    return NextResponse.json(found);
  } catch (e) {
    return serverError(e);
  }
}
