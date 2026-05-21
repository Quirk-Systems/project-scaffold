"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { quirkApi } from "@/lib/quirk/client";

const TYPES = [
  "prompt",
  "song",
  "image",
  "agent",
  "workflow",
  "ui",
  "dataset",
] as const;

export function ExperimentsPanel() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("prompt");
  const [assetId, setAssetId] = useState("");
  const [variantCount, setVariantCount] = useState(4);

  const assets = useQuery({
    queryKey: ["assets"],
    queryFn: () => quirkApi.listAssets(),
  });
  const experiments = useQuery({
    queryKey: ["experiments"],
    queryFn: () => quirkApi.listExperiments(),
  });

  const create = useMutation({
    mutationFn: () =>
      quirkApi.createExperiment({
        name: name || "Untitled experiment",
        experimentType: type,
        inputAssetId: assetId || undefined,
        variantCount,
      }),
    onSuccess: () => {
      setName("");
      queryClient.invalidateQueries({ queryKey: ["experiments"] });
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Run an experiment</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Input
            placeholder="Experiment name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">Type</span>
              <select
                className="border-input bg-background h-9 rounded-md border px-2 text-sm"
                value={type}
                onChange={(e) =>
                  setType(e.target.value as (typeof TYPES)[number])
                }
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">Input asset</span>
              <select
                className="border-input bg-background h-9 min-w-48 rounded-md border px-2 text-sm"
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
              >
                <option value="">— none —</option>
                {assets.data?.assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title ?? a.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">Variants</span>
              <Input
                type="number"
                min={2}
                max={11}
                value={variantCount}
                onChange={(e) => setVariantCount(Number(e.target.value))}
                className="w-20"
              />
            </label>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              {create.isPending ? "Generating…" : "Send to Lab Rat King"}
            </Button>
          </div>
          {create.error && (
            <p className="text-destructive text-sm">
              {(create.error as Error).message}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {experiments.data?.experiments.map((e) => (
          <Card key={e.id}>
            <CardHeader className="gap-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{e.name}</CardTitle>
                <Badge variant="secondary">{e.experimentType}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" variant="outline">
                <Link href={`/quirk/experiments/${e.id}`}>Open board</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
