import { listPublishedAssets } from "@/lib/quirk/assets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const assets = await listPublishedAssets();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gallery</h1>
        <p className="text-muted-foreground text-sm">
          Published assets, ranked by curation quality. Each one cleared the
          full pipeline: capture → annotate → approve → publish.
        </p>
      </div>

      {assets.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nothing here yet. Approve an asset in the inbox, then publish it from
          the annotation chamber.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {assets.map((asset) => (
          <Card key={asset.id}>
            <CardHeader className="gap-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="line-clamp-1 text-base">
                  {asset.title ?? "Untitled"}
                </CardTitle>
                <Badge variant="secondary">{asset.assetType}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">
                  quality{" "}
                  <span className="font-mono font-medium tabular-nums">
                    {asset.qualityScore.toFixed(2)}
                  </span>
                </span>
                <span className="text-muted-foreground text-xs">
                  · {asset.annotationCount} annotation
                  {asset.annotationCount === 1 ? "" : "s"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {asset.rawText && (
                <p className="text-muted-foreground line-clamp-4 text-sm">
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
              <Link
                href={`/quirk/assets/${asset.id}`}
                className="text-muted-foreground hover:text-foreground text-xs underline"
              >
                Annotate · Diff →
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
