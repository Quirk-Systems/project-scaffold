"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScoreBars } from "@/components/quirk/score-bars";
import { quirkApi, type QuirkDiff } from "@/lib/quirk/client";

export function SemanticDiffViewer({ assetId }: { assetId: string }) {
  const queryClient = useQueryClient();
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [draft, setDraft] = useState("");

  const asset = useQuery({
    queryKey: ["asset", assetId],
    queryFn: () => quirkApi.getAsset(assetId),
  });

  const versions = useMemo(
    () => asset.data?.versions ?? [],
    [asset.data?.versions],
  );

  useEffect(() => {
    if (versions.length >= 2 && !toId && !fromId) {
      setToId(versions[0].id);
      setFromId(versions[1].id);
    }
  }, [versions, fromId, toId]);

  const mutate = useMutation({
    mutationFn: () =>
      quirkApi.mutate(assetId, {
        rawText: draft,
        changeSummary: "Manual mutation",
      }),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["asset", assetId] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });

  const diff = useMutation({
    mutationFn: () =>
      quirkApi.createDiff({
        assetId,
        fromVersionId: fromId,
        toVersionId: toId,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["asset", assetId] }),
  });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mutate (new version)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Textarea
            placeholder="Rewrite or evolve the text to create the next version…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div>
            <Button
              onClick={() => mutate.mutate()}
              disabled={!draft.trim() || mutate.isPending}
            >
              {mutate.isPending ? "Creating…" : "Create version"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compare versions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {versions.length < 2 ? (
            <p className="text-muted-foreground text-sm">
              Create at least two versions to compute a semantic diff.
            </p>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <VersionSelect
                label="From"
                value={fromId}
                onChange={setFromId}
                versions={versions}
              />
              <span className="text-muted-foreground pb-2">→</span>
              <VersionSelect
                label="To"
                value={toId}
                onChange={setToId}
                versions={versions}
              />
              <Button
                onClick={() => diff.mutate()}
                disabled={!fromId || !toId || fromId === toId || diff.isPending}
              >
                {diff.isPending ? "Diffing…" : "Ask the Diff Witch"}
              </Button>
            </div>
          )}
          {diff.error && (
            <p className="text-destructive text-sm">
              {(diff.error as Error).message}
            </p>
          )}
        </CardContent>
      </Card>

      {asset.data?.diffs.map((d) => (
        <DiffCard key={d.id} diff={d} />
      ))}
    </div>
  );
}

function VersionSelect({
  label,
  value,
  onChange,
  versions,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  versions: { id: string; versionNumber: number }[];
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <select
        className="border-input bg-background h-9 rounded-md border px-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">—</option>
        {versions.map((v) => (
          <option key={v.id} value={v.id}>
            v{v.versionNumber}
          </option>
        ))}
      </select>
    </label>
  );
}

function DiffCard({ diff }: { diff: QuirkDiff }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{diff.summary}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-medium text-green-600 dark:text-green-400">
              Gained
            </p>
            <ul className="text-muted-foreground space-y-1 text-xs">
              {diff.additions.length === 0 && <li>—</li>}
              {diff.additions.slice(0, 6).map((a, i) => (
                <li key={i} className="line-clamp-1">
                  + {a}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-red-600 dark:text-red-400">
              Lost
            </p>
            <ul className="text-muted-foreground space-y-1 text-xs">
              {diff.removals.length === 0 && <li>—</li>}
              {diff.removals.slice(0, 6).map((r, i) => (
                <li key={i} className="line-clamp-1">
                  − {r}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-medium">Score delta</p>
          <ScoreBars scores={signedToMagnitude(diff.scoreDelta)} />
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.entries(diff.meaningShift)
            .filter(([, v]) => typeof v === "string")
            .map(([k, v]) => (
              <Badge key={k} variant="muted">
                {humanize(k)}: {String(v)}
              </Badge>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Score deltas are signed (−1..1); the bar component expects 0..1, so show the
// absolute magnitude of each shift.
function signedToMagnitude(
  delta: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(delta)) out[k] = Math.abs(v);
  return out;
}

function humanize(key: string): string {
  return key.replace(/([A-Z])/g, " $1").toLowerCase();
}
