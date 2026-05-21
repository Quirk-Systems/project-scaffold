import type {
  QuirkAsset,
  QuirkAssetVersion,
  QuirkAnnotation,
  QuirkDiff,
  QuirkExperiment,
  QuirkRun,
  QuirkPipeline,
  QuirkPipelineStep,
  QuirkPipelineRun,
} from "@/lib/db/schema";
import type { ProposedAnnotation } from "@/lib/quirk/agents/types";

export type {
  QuirkAsset,
  QuirkAssetVersion,
  QuirkAnnotation,
  QuirkDiff,
  QuirkExperiment,
  QuirkRun,
  QuirkPipeline,
  QuirkPipelineStep,
  QuirkPipelineRun,
  ProposedAnnotation,
};

export type AssetSummary = QuirkAsset & {
  versionCount: number;
  annotationCount: number;
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const quirkApi = {
  listAssets: (status?: string) =>
    request<{ assets: AssetSummary[] }>(
      `/api/assets${status ? `?status=${status}` : ""}`,
    ),
  capture: (body: Record<string, unknown>) =>
    request<{ asset: QuirkAsset; version: QuirkAssetVersion }>(
      "/api/assets/capture",
      { method: "POST", body: JSON.stringify(body) },
    ),
  getAsset: (id: string) =>
    request<{
      asset: QuirkAsset;
      versions: QuirkAssetVersion[];
      annotations: QuirkAnnotation[];
      diffs: QuirkDiff[];
    }>(`/api/assets/${id}`),
  mutate: (id: string, body: { rawText: string; changeSummary?: string }) =>
    request<{ version: QuirkAssetVersion }>(`/api/assets/${id}/mutate`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  proposeAnnotations: (id: string) =>
    request<{ proposals: ProposedAnnotation[] }>(
      `/api/assets/${id}/annotations/propose`,
    ),
  saveAnnotations: (
    id: string,
    body: { annotator: string; annotations: ProposedAnnotation[] },
  ) =>
    request<{ annotations: QuirkAnnotation[] }>(
      `/api/assets/${id}/annotations`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  createDiff: (body: {
    assetId: string;
    fromVersionId: string;
    toVersionId: string;
  }) =>
    request<{ diff: QuirkDiff }>("/api/assets/diff", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listExperiments: () =>
    request<{ experiments: QuirkExperiment[] }>("/api/experiments"),
  createExperiment: (body: Record<string, unknown>) =>
    request<{ experiment: QuirkExperiment; runs: QuirkRun[] }>(
      "/api/experiments",
      { method: "POST", body: JSON.stringify(body) },
    ),
  getExperiment: (id: string) =>
    request<{ experiment: QuirkExperiment; runs: QuirkRun[] }>(
      `/api/experiments/${id}`,
    ),
  scoreRun: (
    id: string,
    body: { outcome?: string; score?: number; notes?: string },
  ) =>
    request<{ run: QuirkRun }>(`/api/runs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  promoteRun: (id: string) =>
    request<{ run: QuirkRun }>(`/api/runs/${id}/promote`, { method: "POST" }),
  listPipelines: () =>
    request<{ pipelines: QuirkPipeline[] }>("/api/pipelines"),
  getPipeline: (id: string) =>
    request<{
      pipeline: QuirkPipeline;
      steps: QuirkPipelineStep[];
      runs: QuirkPipelineRun[];
    }>(`/api/pipelines/${id}`),
  runPipeline: (body: { pipelineId: string; assetId: string }) =>
    request<{ run: QuirkPipelineRun }>("/api/pipelines/run", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
