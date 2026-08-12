import { NextResponse } from "next/server";
import { z } from "zod";
import {
  listOffers,
  mintOffer,
  OfferAlreadyMintedError,
} from "@/lib/quirk/offers";
import { registerNames } from "@/lib/ai";
import { parseBody, serverError } from "@/lib/quirk/http";
import { offerStatusEnum } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const STATUSES = offerStatusEnum.enumValues;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("status");
  const status = STATUSES.find((s) => s === raw);
  try {
    const offers = await listOffers(status ? { status } : undefined);
    return NextResponse.json({ offers });
  } catch (e) {
    return serverError(e);
  }
}

const mintSchema = z.object({
  assetId: z.string().uuid(),
  register: z.enum(registerNames as [string, ...string[]]).optional(),
});

export async function POST(request: Request) {
  const parsed = await parseBody(request, mintSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const offer = await mintOffer({
      assetId: parsed.data.assetId,
      register: parsed.data.register as never,
    });
    return NextResponse.json({ offer }, { status: 201 });
  } catch (e) {
    if (e instanceof OfferAlreadyMintedError) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    return serverError(e);
  }
}
