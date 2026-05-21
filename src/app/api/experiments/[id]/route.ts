import { NextResponse } from "next/server";
import { getExperiment } from "@/lib/quirk/experiments";
import { notFound, serverError } from "@/lib/quirk/http";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const found = await getExperiment(id);
    if (!found) return notFound("Experiment not found");
    return NextResponse.json(found);
  } catch (e) {
    return serverError(e);
  }
}
