import { NextResponse } from "next/server";
import { promoteRun } from "@/lib/quirk/experiments";
import { notFound, serverError } from "@/lib/quirk/http";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const run = await promoteRun(id);
    if (!run) return notFound("Run not found");
    return NextResponse.json({ run }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
