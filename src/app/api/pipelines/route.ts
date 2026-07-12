import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createPipeline,
  ensureDefaultPipeline,
  listPipelines,
} from "@/lib/quirk/pipelines";
import { parseBody, serverError } from "@/lib/quirk/http";

export const dynamic = "force-dynamic";

const stepSchema = z.object({
  stepKey: z.string().min(1),
  stepName: z.string().min(1),
  agentRole: z.string().nullable().default(null),
});

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  steps: z.array(stepSchema).optional(),
});

export async function GET() {
  try {
    await ensureDefaultPipeline();
    return NextResponse.json({ pipelines: await listPipelines() });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(request: Request) {
  const parsed = await parseBody(request, createSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const pipeline = await createPipeline(parsed.data);
    return NextResponse.json({ pipeline }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
