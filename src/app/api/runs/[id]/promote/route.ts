import { NextResponse } from "next/server";
import { promoteRun } from "@/lib/quirk/experiments";
import { AuthorityDeniedError } from "@/lib/quirk/governance/authority";
import { notFound, serverError } from "@/lib/quirk/http";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authorityToken = request.headers.get("x-quirk-authority");

  try {
    const promoted = await promoteRun(id, authorityToken);
    if (!promoted) return notFound("Run not found");
    return NextResponse.json(
      {
        run: promoted.run,
        offer: promoted.offer,
        goldilocks: promoted.goldilocks,
      },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof AuthorityDeniedError) {
      return NextResponse.json(
        {
          error: "authority_denied",
          never: e.never,
          reason: e.reason,
        },
        { status: 403 },
      );
    }
    return serverError(e);
  }
}
