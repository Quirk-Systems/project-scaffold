"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { isConflict, quirkApi, type OfferWithAsset } from "@/lib/quirk/client";

const FILTERS = ["all", "open", "claimed", "retired"] as const;
type Filter = (typeof FILTERS)[number];

export function OffersBoard() {
  const [filter, setFilter] = useState<Filter>("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["offers", filter],
    queryFn: () => quirkApi.listOffers(filter === "all" ? undefined : filter),
  });

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground text-sm">
        One-of-one drops minted from curated assets. Each can be claimed by
        exactly one person — after that, it&apos;s gone.
      </p>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
          >
            {f}
          </Button>
        ))}
      </div>

      {isLoading && (
        <p className="text-muted-foreground text-sm">Loading offers…</p>
      )}
      {error && (
        <p className="text-destructive text-sm">{(error as Error).message}</p>
      )}
      {data && data.offers.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No offers minted yet. Promote a winning run, or mint one from an
          approved asset via <code>POST /api/offers</code>.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {data?.offers.map((offer) => (
          <OfferCard key={offer.id} offer={offer} />
        ))}
      </div>
    </div>
  );
}

function OfferCard({ offer }: { offer: OfferWithAsset }) {
  const queryClient = useQueryClient();
  const claim = useMutation({
    mutationFn: () => quirkApi.claimOffer(offer.id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["offers"] }),
  });

  const overall = offer.scores?.overall;

  // The card's one status line says what this viewer's claim did. A 409 means
  // the offer stopped being open first (someone else claimed it, or it was
  // retired); until the refetch says which, it only says it was missed. The
  // line is an always-mounted live region whose text changes, so screen
  // readers announce the outcome.
  const lostRace = isConflict(claim.error);
  const statusLine =
    offer.status === "open"
      ? lostRace
        ? "Missed it. This one is no longer open."
        : ""
      : offer.status === "claimed"
        ? lostRace
          ? "Missed it. Someone else claimed this one."
          : claim.isSuccess
            ? "You claimed it. This one is yours."
            : "Claimed. This one belongs to someone now."
        : lostRace
          ? "Missed it. This one was retired."
          : "Retired.";

  return (
    <Card className={offer.status !== "open" ? "opacity-70" : undefined}>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <CardTitle className="text-base leading-snug">
          <Link
            href={`/quirk/assets/${offer.assetId}`}
            className="hover:underline"
          >
            {offer.title}
          </Link>
        </CardTitle>
        <div className="flex shrink-0 gap-1">
          <Badge variant="outline">1/1</Badge>
          <Badge variant={offer.status === "open" ? "default" : "secondary"}>
            {offer.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-muted-foreground text-sm italic">
          &ldquo;{offer.pitch}&rdquo;
        </p>
        <div className="text-muted-foreground flex items-center gap-3 text-xs">
          <span>{offer.asset.assetType}</span>
          {typeof overall === "number" && <span>quality {overall}</span>}
          {offer.register && <span>voiced: {offer.register}</span>}
        </div>
        {offer.status === "open" && (
          <Button
            size="sm"
            onClick={() => claim.mutate()}
            disabled={claim.isPending}
          >
            {claim.isPending ? "Claiming…" : "Claim it — only one exists"}
          </Button>
        )}
        <p
          role="status"
          className={cn(
            "text-muted-foreground text-xs",
            !statusLine && "sr-only",
          )}
        >
          {statusLine}
        </p>
        {claim.error && !lostRace && (
          <p className="text-destructive text-xs" role="alert">
            {claim.error.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
