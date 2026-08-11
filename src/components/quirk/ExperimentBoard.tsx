"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreBars } from "@/components/quirk/score-bars";
import { quirkApi, type QuirkRun } from "@/lib/quirk/client";

export function ExperimentBoard({ experimentId }: { experimentId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["experiment", experimentId],
    queryFn: () => quirkApi.getExperiment(experimentId),
  });

  if (isLoading)
    return <p className="text-muted-foreground text-sm">Loading experiment…</p>;
  if (error)
    return (
      <p className="text-destructive text-sm">{(error as Error).message}</p>
    );
  if (!data) return null;

  const sorted = [...data.runs].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{data.experiment.name}</h2>
        <Badge variant="secondary">{data.experiment.experimentType}</Badge>
        <Badge variant="muted">{data.experiment.status}</Badge>
        <AutoPromoteButton experimentId={experimentId} />
      </div>
      {data.experiment.objective && (
        <p className="text-muted-foreground text-sm">
          {data.experiment.objective}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sorted.map((run) => (
          <RunCard key={run.id} run={run} experimentId={experimentId} />
        ))}
      </div>
    </div>
  );
}

function AutoPromoteButton({ experimentId }: { experimentId: string }) {
  const queryClient = useQueryClient();
  const promote = useMutation({
    mutationFn: () => quirkApi.autoPromoteExperiment(experimentId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["experiment", experimentId] }),
  });

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => promote.mutate()}
        disabled={promote.isPending}
      >
        {promote.isPending ? "Auto-promoting…" : "Auto-promote"}
      </Button>
      {promote.error && (
        <span className="text-destructive text-xs">
          {(promote.error as Error).message}
        </span>
      )}
    </div>
  );
}

function RunCard({
  run,
  experimentId,
}: {
  run: QuirkRun;
  experimentId: string;
}) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["experiment", experimentId] });

  const score = useMutation({
    mutationFn: (outcome: string) => quirkApi.scoreRun(run.id, { outcome }),
    onSuccess: invalidate,
  });
  const promote = useMutation({
    mutationFn: () => quirkApi.promoteRun(run.id),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });

  const output = (run.parameters as { output?: string }).output ?? "";

  return (
    <Card className={run.outcome === "winner" ? "ring-primary ring-2" : ""}>
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">{run.notes ?? "variant"}</CardTitle>
          <Badge variant={run.outcome === "winner" ? "default" : "muted"}>
            {run.outcome}
          </Badge>
        </div>
        <div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
          <span>model: {run.model ?? "—"}</span>
          {run.persona && <span>persona: {run.persona}</span>}
          {run.mask && <span>mask: {run.mask}</span>}
          <span>score: {(run.score ?? 0).toFixed(2)}</span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-muted-foreground max-h-32 overflow-auto text-xs whitespace-pre-wrap">
          {output || "(no output)"}
        </p>
        <ScoreBars scores={run.metrics as Record<string, number>} />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={run.outcome === "winner" ? "default" : "outline"}
            onClick={() => score.mutate("winner")}
            disabled={score.isPending}
          >
            Winner
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => score.mutate("reject")}
            disabled={score.isPending}
          >
            Reject
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => score.mutate("mutate_again")}
            disabled={score.isPending}
          >
            Mutate Again
          </Button>
          <Button
            size="sm"
            onClick={() => promote.mutate()}
            disabled={promote.isPending}
          >
            {promote.isPending ? "Promoting…" : "Promote"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
