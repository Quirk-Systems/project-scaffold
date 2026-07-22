"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  quirkApi,
  type AssetSummary,
  type QuirkAsset,
} from "@/lib/quirk/client";

const FILTERS = [
  "all",
  "captured",
  "annotated",
  "mutated",
  "approved",
] as const;
type Filter = (typeof FILTERS)[number];

const ASSET_TYPES = [
  "all",
  "text",
  "image",
  "audio",
  "video",
  "pdf",
  "web_clip",
  "prompt",
  "song",
  "dataset",
  "other",
] as const;

export type AssetInboxProps = {
  filter?: Exclude<Filter, "all">;
};

export function AssetInbox({ filter: initial }: AssetInboxProps) {
  const [filter, setFilter] = useState<Filter>(initial ?? "all");
  const [assetType, setAssetType] =
    useState<(typeof ASSET_TYPES)[number]>("all");
  const [search, setSearch] = useState("");
  const [tags, setTags] = useState("");
  const queryClient = useQueryClient();
  const discoveryActive =
    Boolean(search.trim() || tags.trim()) || assetType !== "all";

  const { data, isLoading, error } = useQuery({
    queryKey: ["assets", "search", filter, assetType, search, tags],
    queryFn: async () => {
      if (!discoveryActive) {
        const result = await quirkApi.listAssets(
          filter === "all" ? undefined : filter,
        );
        return {
          hits: result.assets.map((asset) => ({ asset, similarity: null })),
        };
      }
      return quirkApi.searchAssets({
        text: search || undefined,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        assetTypes: assetType === "all" ? undefined : [assetType],
        statuses: filter === "all" ? undefined : [filter],
      });
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <CaptureForm
        onCaptured={() =>
          queryClient.invalidateQueries({ queryKey: ["assets"] })
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search and discovery</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Input
            aria-label="Search assets"
            placeholder="Search title or content"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Input
            aria-label="Filter by tags"
            placeholder="Tags, comma-separated"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
          />
          <select
            aria-label="Filter by asset type"
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            value={assetType}
            onChange={(event) =>
              setAssetType(event.target.value as (typeof ASSET_TYPES)[number])
            }
          >
            {ASSET_TYPES.map((type) => (
              <option key={type} value={type}>
                {type === "all" ? "All asset types" : type}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

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
      {data && data.hits.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No assets yet. Capture a messy scrap above to begin.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {data?.hits.map(({ asset, similarity }) => (
          <AssetCard key={asset.id} asset={asset} similarity={similarity} />
        ))}
      </div>
    </div>
  );
}

function AssetCard({
  asset,
  similarity,
}: {
  asset: AssetSummary | QuirkAsset;
  similarity?: number | null;
}) {
  const versionCount = "versionCount" in asset ? asset.versionCount : null;
  const annotationCount =
    "annotationCount" in asset ? asset.annotationCount : null;
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
          {versionCount !== null && annotationCount !== null && (
            <span className="text-muted-foreground text-xs">
              {versionCount} version{versionCount === 1 ? "" : "s"} ·{" "}
              {annotationCount} annotation
              {annotationCount === 1 ? "" : "s"}
            </span>
          )}
          {similarity != null && (
            <span className="text-muted-foreground text-xs">
              {Math.round(similarity * 100)}% match
            </span>
          )}
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
  const [uploadTitle, setUploadTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

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

  const upload = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("Choose a file to upload");
      const form = new FormData();
      form.set("file", file);
      if (uploadTitle.trim()) form.set("title", uploadTitle.trim());
      return quirkApi.uploadAsset(form);
    },
    onSuccess: () => {
      setUploadTitle("");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
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
        <div className="border-t pt-3">
          <p className="mb-3 text-sm font-medium">Or upload media</p>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Input
              placeholder="Media title (optional)"
              value={uploadTitle}
              onChange={(event) => setUploadTitle(event.target.value)}
            />
            <Input
              ref={fileInput}
              type="file"
              accept="image/*,audio/*,video/*,application/pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <Button
              variant="outline"
              onClick={() => upload.mutate()}
              disabled={!file || upload.isPending}
            >
              {upload.isPending ? "Uploading…" : "Upload"}
            </Button>
          </div>
          {upload.error && (
            <p className="text-destructive mt-2 text-sm">
              {(upload.error as Error).message}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
