import { NextResponse } from "next/server";
import { z } from "zod";
import { createExperiment, listExperiments } from "@/lib/quirk/experiments";
import { parseBody, serverError } from "@/lib/quirk/http";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1),
  experimentType: z.enum([
    "prompt",
    "song",
    "image",
    "agent",
    "workflow",
    "ui",
    "dataset",
  ]),
  objective: z.string().optional(),
  inputAssetId: z.string().uuid().optional(),
  variantCount: z.number().int().min(2).max(11).optional(),
  model: z.string().optional(),
  persona: z.string().optional(),
  mask: z.string().optional(),
});

export async function GET() {
  try {
    return NextResponse.json({ experiments: await listExperiments() });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(request: Request) {
  const parsed = await parseBody(request, createSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const result = await createExperiment(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
