import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOffer, retireOffer } from "@/lib/quirk/offers";
import { notFound, serverError } from "@/lib/quirk/http";

export const dynamic = "force-dynamic";

// Curatorial pull-back. Only open offers can be retired — a claimed offer
// already belongs to someone, and retiring it would break the 1/1 promise.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Sign in to retire an offer" },
      { status: 401 },
    );
  }

  try {
    const existing = await getOffer(id);
    if (!existing) return notFound("Offer not found");

    const retired = await retireOffer(id);
    if (!retired) {
      return NextResponse.json(
        { error: `Offer is ${existing.status}, not open — cannot retire` },
        { status: 409 },
      );
    }
    return NextResponse.json({ offer: retired });
  } catch (e) {
    return serverError(e);
  }
}
