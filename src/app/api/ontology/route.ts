import { NextResponse } from "next/server";
import { listProjectedEntities } from "@/lib/ontology/project";
import { serverError } from "@/lib/quirk/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const entities = await listProjectedEntities();
    return NextResponse.json({ entities });
  } catch (error) {
    return serverError(error);
  }
}
