"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { quirkApi, type OfferWithAsset } from "@/lib/quirk/client";

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
        {offer.status === "open" ? (
          <Button
            size="sm"
            onClick={() => claim.mutate()}
            disabled={claim.isPending}
          >
            {claim.isPending ? "Claiming…" : "Claim it — only one exists"}
          </Button>
        ) : (
          <p className="text-muted-foreground text-xs">
            {offer.status === "claimed"
              ? "Claimed. This one belongs to someone now."
              : "Retired."}
          </p>
        )}
        {claim.error && (
          <p className="text-destructive text-xs">
            {(claim.error as Error).message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
