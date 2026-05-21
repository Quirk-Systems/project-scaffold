"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AGENT_LABELS, type AgentRole } from "@/lib/quirk/agents/types";
import {
  quirkApi,
  type QuirkPipelineRun,
  type QuirkPipelineStep,
} from "@/lib/quirk/client";

export function PipelineMap({ pipelineId }: { pipelineId?: string }) {
  const pipelines = useQuery({
    queryKey: ["pipelines"],
    queryFn: () => quirkApi.listPipelines(),
    enabled: !pipelineId,
  });

  const resolvedId = pipelineId ?? pipelines.data?.pipelines[0]?.id;
  if (!resolvedId)
    return <p className="text-muted-foreground text-sm">Loading pipeline…</p>;

  return <ResolvedPipeline pipelineId={resolvedId} />;
}

function ResolvedPipeline({ pipelineId }: { pipelineId: string }) {
  const queryClient = useQueryClient();
  const [assetId, setAssetId] = useState("");

  const pipeline = useQuery({
    queryKey: ["pipeline", pipelineId],
    queryFn: () => quirkApi.getPipeline(pipelineId),
  });
  const assets = useQuery({
    queryKey: ["assets"],
    queryFn: () => quirkApi.listAssets(),
  });

  const run = useMutation({
    mutationFn: () => quirkApi.runPipeline({ pipelineId, assetId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline", pipelineId] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });

  if (!pipeline.data)
    return <p className="text-muted-foreground text-sm">Loading…</p>;

  const latestStep = pipeline.data.runs[0]?.currentStep;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">{pipeline.data.pipeline.name}</h2>
        {pipeline.data.pipeline.description && (
          <p className="text-muted-foreground text-sm">
            {pipeline.data.pipeline.description}
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-start gap-1">
            {pipeline.data.steps.map((step, i) => (
              <StepRow
                key={step.id}
                step={step}
                isLast={i === pipeline.data!.steps.length - 1}
                active={step.stepKey === latestStep}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Run pipeline</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">Asset</span>
            <select
              className="border-input bg-background h-9 min-w-48 rounded-md border px-2 text-sm"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
            >
              <option value="">— pick an asset —</option>
              {assets.data?.assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title ?? a.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>
          <Button
            onClick={() => run.mutate()}
            disabled={!assetId || run.isPending}
          >
            {run.isPending ? "Running…" : "Send to Pipeline Foreman"}
          </Button>
          {run.error && (
            <p className="text-destructive text-sm">
              {(run.error as Error).message}
            </p>
          )}
        </CardContent>
      </Card>

      {pipeline.data.runs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent runs</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {pipeline.data.runs.slice(0, 5).map((r) => (
              <RunLog key={r.id} run={r} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StepRow({
  step,
  isLast,
  active,
}: {
  step: QuirkPipelineStep;
  isLast: boolean;
  active: boolean;
}) {
  const roleLabel = step.agentRole
    ? (AGENT_LABELS[step.agentRole as AgentRole] ?? step.agentRole)
    : "Human gate";
  return (
    <div className="flex flex-col items-start">
      <div className="flex items-center gap-2">
        <span
          className={
            active
              ? "bg-primary text-primary-foreground rounded-md px-2 py-1 text-sm font-medium"
              : "text-sm font-medium"
          }
        >
          {step.stepName}
        </span>
        <Badge variant={step.agentRole ? "muted" : "outline"}>
          {roleLabel}
        </Badge>
      </div>
      {!isLast && <span className="text-muted-foreground pl-2 text-lg">↓</span>}
    </div>
  );
}

function RunLog({ run }: { run: QuirkPipelineRun }) {
  return (
    <div className="rounded-md border p-3">
      <div className="mb-2 flex items-center gap-2">
        <Badge variant={run.status === "completed" ? "default" : "secondary"}>
          {run.status}
        </Badge>
        {run.currentStep && (
          <span className="text-muted-foreground text-xs">
            halted at {run.currentStep}
          </span>
        )}
      </div>
      <ul className="space-y-1 text-xs">
        {run.logs.map((log, i) => (
          <li key={i} className="text-muted-foreground">
            <span className="font-medium">{log.step}</span> · {log.status} —{" "}
            {log.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
