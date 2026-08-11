import { NextResponse } from "next/server";
import { z } from "zod";
import { autoPromoteExperiment } from "@/lib/quirk/experiments";
import { notFound, serverError } from "@/lib/quirk/http";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  qualityThreshold: z.number().min(0).max(1).optional(),
});

/**
 * Lab Rat King auto-promote: find the highest-scoring pending run in this
 * experiment that meets the quality threshold and promote it automatically.
 *
 * Body (optional JSON):
 *   qualityThreshold — 0..1, default 0.5
 *
 * Returns 404 if the experiment has no eligible runs above the threshold.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Body is fully optional — parse it if present, fall back to defaults.
  let qualityThreshold: number | undefined;
  try {
    const body = await request.json() as unknown;
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    qualityThreshold = parsed.data.qualityThreshold;
  } catch {
    // Empty body — use defaults.
  }

  try {
    const result = await autoPromoteExperiment(id, qualityThreshold);
    if (!result) {
      return notFound(
        "No pending run meets the quality threshold in this experiment",
      );
    }
    return NextResponse.json(
      { run: result.run, offer: result.offer, goldilocks: result.goldilocks },
      { status: 201 },
    );
  } catch (e) {
    return serverError(e);
  }
}
