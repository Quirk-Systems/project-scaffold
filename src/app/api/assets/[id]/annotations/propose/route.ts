import { NextResponse } from "next/server";
import { proposeAnnotations } from "@/lib/quirk/annotations";
import { notFound, serverError } from "@/lib/quirk/http";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const proposals = await proposeAnnotations(id);
    if (!proposals) return notFound("Asset not found");
    return NextResponse.json({ proposals });
  } catch (e) {
    return serverError(e);
  }
}
