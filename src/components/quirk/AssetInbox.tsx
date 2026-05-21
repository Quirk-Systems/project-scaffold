"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { quirkApi, type AssetSummary } from "@/lib/quirk/client";

const FILTERS = [
  "all",
  "captured",
  "annotated",
  "mutated",
  "approved",
] as const;
type Filter = (typeof FILTERS)[number];

export type AssetInboxProps = {
  filter?: Exclude<Filter, "all">;
};

export function AssetInbox({ filter: initial }: AssetInboxProps) {
  const [filter, setFilter] = useState<Filter>(initial ?? "all");
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["assets", filter],
    queryFn: () => quirkApi.listAssets(filter === "all" ? undefined : filter),
  });

  return (
    <div className="flex flex-col gap-6">
      <CaptureForm
        onCaptured={() =>
          queryClient.invalidateQueries({ queryKey: ["assets"] })
        }
      />

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
        <p className="text-muted-foreground text-sm">Loading assets…</p>
      )}
      {error && (
        <p className="text-destructive text-sm">{(error as Error).message}</p>
      )}
      {data && data.assets.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No assets yet. Capture a messy scrap above to begin.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {data?.assets.map((asset) => (
          <AssetCard key={asset.id} asset={asset} />
        ))}
      </div>
    </div>
  );
}

function AssetCard({ asset }: { asset: AssetSummary }) {
  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">
            {asset.title ?? "Untitled scrap"}
          </CardTitle>
          <Badge variant="secondary">{asset.assetType}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="muted">{asset.status}</Badge>
          <span className="text-muted-foreground text-xs">
            {asset.versionCount} version{asset.versionCount === 1 ? "" : "s"} ·{" "}
            {asset.annotationCount} annotation
            {asset.annotationCount === 1 ? "" : "s"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {asset.rawText && (
          <p className="text-muted-foreground line-clamp-3 text-sm">
            {asset.rawText}
          </p>
        )}
        {asset.sourceUrl && (
          <a
            href={asset.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary truncate text-xs underline"
          >
            {asset.sourceUrl}
          </a>
        )}
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/quirk/assets/${asset.id}`}>Annotate · Diff</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CaptureForm({ onCaptured }: { onCaptured: () => void }) {
  const [title, setTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      quirkApi.capture({
        title: title || undefined,
        rawText: rawText || undefined,
        sourceUrl: sourceUrl || undefined,
      }),
    onSuccess: () => {
      setTitle("");
      setRawText("");
      setSourceUrl("");
      onCaptured();
    },
  });

  const canSubmit = (rawText.trim() || sourceUrl.trim()) && !mutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Capture a scrap</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Input
          placeholder="Title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Textarea
          placeholder="Paste text, a transcript, a prompt, a song draft…"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
        />
        <Input
          placeholder="Source URL (optional)"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
        />
        {mutation.error && (
          <p className="text-destructive text-sm">
            {(mutation.error as Error).message}
          </p>
        )}
        <div>
          <Button onClick={() => mutation.mutate()} disabled={!canSubmit}>
            {mutation.isPending ? "Capturing…" : "Send to Archivist Goblin"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
