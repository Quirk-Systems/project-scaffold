import { NextResponse } from "next/server";
import { z } from "zod";
import { mutateAsset } from "@/lib/quirk/assets";
import { notFound, parseBody, serverError } from "@/lib/quirk/http";

export const dynamic = "force-dynamic";

const mutateSchema = z.object({
  rawText: z.string().min(1),
  changeSummary: z.string().optional(),
  createdBy: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = await parseBody(request, mutateSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const version = await mutateAsset(id, parsed.data);
    if (!version) return notFound("Asset not found");
    return NextResponse.json({ version }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
