"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  quirkApi,
  type ProposedAnnotation,
  type QuirkAnnotation,
} from "@/lib/quirk/client";

export function AnnotationChamber({ assetId }: { assetId: string }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Record<number, ProposedAnnotation>>(
    {},
  );

  const asset = useQuery({
    queryKey: ["asset", assetId],
    queryFn: () => quirkApi.getAsset(assetId),
  });

  const proposals = useQuery({
    queryKey: ["asset", assetId, "proposals"],
    queryFn: () => quirkApi.proposeAnnotations(assetId),
  });

  const save = useMutation({
    mutationFn: (annotations: ProposedAnnotation[]) =>
      quirkApi.saveAnnotations(assetId, { annotator: "user", annotations }),
    onSuccess: () => {
      setSelected({});
      queryClient.invalidateQueries({ queryKey: ["asset", assetId] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });

  function toggle(index: number, proposal: ProposedAnnotation) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[index]) delete next[index];
      else next[index] = proposal;
      return next;
    });
  }

  function setConfidence(index: number, confidence: number) {
    setSelected((prev) =>
      prev[index] ? { ...prev, [index]: { ...prev[index], confidence } } : prev,
    );
  }

  const chosen = Object.values(selected);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Asset Preview</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {asset.data && (
            <>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{asset.data.asset.assetType}</Badge>
                <Badge variant="muted">{asset.data.asset.status}</Badge>
              </div>
              <p className="text-sm font-medium">{asset.data.asset.title}</p>
              <p className="text-muted-foreground max-h-48 overflow-auto text-sm whitespace-pre-wrap">
                {asset.data.asset.rawText ?? "(no extracted text)"}
              </p>
              {asset.data.asset.status === "approved" && (
                <PublishButton
                  assetId={assetId}
                  onPublished={() =>
                    queryClient.invalidateQueries({ queryKey: ["asset", assetId] })
                  }
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Curator Imp Proposals</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => proposals.refetch()}
            disabled={proposals.isFetching}
          >
            {proposals.isFetching ? "Thinking…" : "Re-propose"}
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {proposals.data?.proposals.map((p, i) => {
            const isOn = Boolean(selected[i]);
            return (
              <div
                key={`${p.annotationType}-${p.label}-${i}`}
                className="flex flex-col gap-2 rounded-md border p-3"
              >
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isOn}
                    onChange={() => toggle(i, p)}
                    className="mt-1"
                  />
                  <span className="flex flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{p.annotationType}</Badge>
                      <span className="text-sm font-medium">{p.label}</span>
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {renderValue(p.value)}
                    </span>
                  </span>
                </label>
                {isOn && (
                  <div className="flex items-center gap-2 pl-7">
                    <span className="text-muted-foreground w-24 text-xs">
                      confidence
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={selected[i]?.confidence ?? p.confidence}
                      onChange={(e) => setConfidence(i, Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="w-8 text-right text-xs tabular-nums">
                      {(selected[i]?.confidence ?? p.confidence).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {save.error && (
            <p className="text-destructive text-sm">
              {(save.error as Error).message}
            </p>
          )}

          <div>
            <Button
              onClick={() => save.mutate(chosen)}
              disabled={chosen.length === 0 || save.isPending}
            >
              {save.isPending
                ? "Saving…"
                : `Save ${chosen.length} annotation${chosen.length === 1 ? "" : "s"}`}
            </Button>
          </div>
        </CardContent>
      </Card>

      <SavedAnnotations annotations={asset.data?.annotations ?? []} />
    </div>
  );
}

function PublishButton({
  assetId,
  onPublished,
}: {
  assetId: string;
  onPublished: () => void;
}) {
  const publish = useMutation({
    mutationFn: () => quirkApi.publishAsset(assetId),
    onSuccess: onPublished,
  });

  return (
    <div className="flex flex-col gap-1">
      <Button
        size="sm"
        onClick={() => publish.mutate()}
        disabled={publish.isPending}
      >
        {publish.isPending ? "Publishing…" : "Publish"}
      </Button>
      {publish.error && (
        <p className="text-destructive text-xs">
          {(publish.error as Error).message}
        </p>
      )}
    </div>
  );
}

function SavedAnnotations({ annotations }: { annotations: QuirkAnnotation[] }) {
  if (annotations.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Saved Annotations</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {annotations.map((a) => (
          <Badge key={a.id} variant="secondary" title={a.annotationType}>
            {a.annotationType}: {a.label ?? "—"}
          </Badge>
        ))}
      </CardContent>
    </Card>
  );
}

function renderValue(value: Record<string, unknown>): string {
  const keys = Object.keys(value);
  if (keys.length === 0) return "";
  return keys
    .map((k) => `${k}: ${formatPrimitive(value[k])}`)
    .slice(0, 3)
    .join(" · ");
}

function formatPrimitive(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
