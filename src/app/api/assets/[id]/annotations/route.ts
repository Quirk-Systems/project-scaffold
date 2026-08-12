import { NextResponse } from "next/server";
import { z } from "zod";
import { listAnnotations, saveAnnotations } from "@/lib/quirk/annotations";
import { parseBody, serverError } from "@/lib/quirk/http";
import { annotationTypeEnum } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const annotationSchema = z.object({
  annotationType: z.enum(annotationTypeEnum.enumValues),
  label: z.string().nullable().optional(),
  value: z.record(z.unknown()).default({}),
  confidence: z.number().min(0).max(1).optional(),
});

const saveSchema = z.object({
  annotator: z.string().default("user"),
  annotations: z.array(annotationSchema).min(1),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    return NextResponse.json({ annotations: await listAnnotations(id) });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = await parseBody(request, saveSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const annotations = parsed.data.annotations.map((a) => ({
      annotationType: a.annotationType,
      label: a.label ?? null,
      value: a.value,
      confidence: a.confidence ?? 0.5,
    }));
    const saved = await saveAnnotations(id, parsed.data.annotator, annotations);
    return NextResponse.json({ annotations: saved }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
