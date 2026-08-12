import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { claimOffer, getOffer } from "@/lib/quirk/offers";
import { notFound, serverError } from "@/lib/quirk/http";

export const dynamic = "force-dynamic";

// The one-of-one moment: a single conditional UPDATE decides who obtains it.
// Losing the race is a 409, not an error — someone else simply got there.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Sign in to claim an offer" },
      { status: 401 },
    );
  }

  try {
    const existing = await getOffer(id);
    if (!existing) return notFound("Offer not found");

    const claimed = await claimOffer({
      offerId: id,
      userId: session.user.id,
    });
    if (!claimed) {
      return NextResponse.json(
        { error: "Already claimed — this one is gone" },
        { status: 409 },
      );
    }
    return NextResponse.json({ offer: claimed });
  } catch (e) {
    return serverError(e);
  }
}
