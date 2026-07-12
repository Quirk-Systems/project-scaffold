import { NextResponse } from "next/server";
import { z } from "zod";
import { runPipeline } from "@/lib/quirk/pipelines";
import { notFound, parseBody, serverError } from "@/lib/quirk/http";

export const dynamic = "force-dynamic";

const runSchema = z.object({
  pipelineId: z.string().uuid(),
  assetId: z.string().uuid(),
  startAfter: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  const parsed = await parseBody(request, runSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const run = await runPipeline(parsed.data);
    if (!run) return notFound("Pipeline or asset not found");
    return NextResponse.json({ run }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
