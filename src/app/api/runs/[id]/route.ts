import { NextResponse } from "next/server";
import { z } from "zod";
import { scoreRun } from "@/lib/quirk/experiments";
import { notFound, parseBody, serverError } from "@/lib/quirk/http";

export const dynamic = "force-dynamic";

const scoreSchema = z.object({
  outcome: z.enum(["pending", "winner", "reject", "mutate_again"]).optional(),
  score: z.number().optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = await parseBody(request, scoreSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const run = await scoreRun(id, parsed.data);
    if (!run) return notFound("Run not found");
    return NextResponse.json({ run });
  } catch (e) {
    return serverError(e);
  }
}
