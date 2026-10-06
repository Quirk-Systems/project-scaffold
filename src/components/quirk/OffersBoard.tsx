"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { isConflict, quirkApi, type OfferWithAsset } from "@/lib/quirk/client";

const FILTERS = ["all", "open", "claimed", "retired"] as const;
type Filter = (typeof FILTERS)[number];

function parseFilter(value: string | undefined): Filter {
  return FILTERS.find((f) => f === value) ?? "all";
}

/** What this viewer's own claim did: won it, or lost the race (HTTP 409). */
type ClaimResult = { title: string; outcome: "won" | "lost" };

export function OffersBoard() {
  const searchParams = useSearchParams();
  const statuses = searchParams.getAll("status");
  const filter = parseFilter(statuses.length === 1 ? statuses[0] : undefined);

  // Next keeps useSearchParams in sync with native history and router navigation.
  // replaceState avoids a server round trip and a new history entry.
  function selectFilter(next: Filter) {
    const url = new URL(window.location.href);
    if (next === "all") url.searchParams.delete("status");
    else url.searchParams.set("status", next);
    // Next copies its internal history state; passing it here bypasses its URL update.
    window.history.replaceState(null, "", url);
  }
  // Kept here, not in each card: a refetch under the "open" filter drops the
  // offer a viewer just won or lost, and its card's state with it.
  const [results, setResults] = useState<Record<string, ClaimResult>>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ["offers", filter],
    queryFn: () => quirkApi.listOffers(filter === "all" ? undefined : filter),
  });

  // An unloaded or failed list shows no offer, so every saved result is
  // reported here rather than waiting for some filter to load.
  const shown = new Set(data?.offers.map((o) => o.id));
  const offscreen = Object.entries(results)
    .filter(([id]) => !shown.has(id))
    .map(([, r]) =>
      r.outcome === "won"
        ? `You claimed \u201c${r.title}\u201d. It\u2019s yours.`
        : `Missed \u201c${r.title}\u201d. It is no longer open.`,
    )
    .join(" ");

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground text-sm">
        One-of-one drops minted from curated assets. Each can be claimed by
        exactly one person — after that, it&apos;s gone.
      </p>

      <div
        role="group"
        aria-label="Filter offers"
        className="flex flex-wrap gap-2"
      >
        {FILTERS.map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            aria-pressed={filter === f}
            onClick={() => selectFilter(f)}
          >
            {f}
          </Button>
        ))}
      </div>

      <p
        role="status"
        className={cn("text-muted-foreground text-sm", !offscreen && "sr-only")}
      >
        {offscreen}
      </p>

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
          <OfferCard
            key={offer.id}
            offer={offer}
            result={results[offer.id]?.outcome}
            onResult={(outcome) =>
              setResults((prev) =>
                // A win stands: a later 409 (a retry, another tab) is about
                // the same claim and never downgrades it.
                prev[offer.id]?.outcome === "won"
                  ? prev
                  : { ...prev, [offer.id]: { title: offer.title, outcome } },
              )
            }
          />
        ))}
      </div>
    </div>
  );
}

function OfferCard({
  offer,
  result,
  onResult,
}: {
  offer: OfferWithAsset;
  result?: ClaimResult["outcome"];
  onResult: (outcome: ClaimResult["outcome"]) => void;
}) {
  const queryClient = useQueryClient();
  const claim = useMutation({
    mutationFn: () => quirkApi.claimOffer(offer.id),
    onSuccess: () => onResult("won"),
    onError: (error) => {
      if (isConflict(error)) onResult("lost");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["offers"] }),
  });

  const overall = offer.scores?.overall;

  // The card's one status line says what this viewer's claim did. A 409 means
  // the offer stopped being open first: claimed (perhaps by this viewer in
  // another tab) or retired, so the copy claims no more than that. The line is
  // an always-mounted live region whose text changes, so screen readers
  // announce the outcome.
  // A won claim counts at once, without waiting for the refetch (which can
  // fail and leave this offer looking open).
  const statusLine =
    result === "won"
      ? "You claimed it. This one is yours."
      : offer.status === "open"
        ? result === "lost"
          ? "Missed it. This one is no longer open."
          : ""
        : offer.status === "claimed"
          ? result === "lost"
            ? "Missed it. This one was claimed first."
            : "Claimed. This one belongs to someone now."
          : result === "lost"
            ? "Missed it. This one was retired."
            : "Retired.";

  // The badge and styling follow the recorded result too, so a failed refetch
  // that leaves the cached offer "open" cannot contradict the status line.
  const gone = offer.status !== "open" || !!result;
  const badgeLabel =
    result === "won"
      ? "claimed"
      : result === "lost" && offer.status === "open"
        ? "closed"
        : offer.status;

  return (
    <Card className={gone ? "opacity-70" : undefined}>
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
          <Badge variant={gone ? "secondary" : "default"}>{badgeLabel}</Badge>
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
        {offer.status === "open" && !result && (
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
        {claim.error && !isConflict(claim.error) && (
          <p className="text-destructive text-xs" role="alert">
            {claim.error.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
