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
  QuirkOffer,
} from "@/lib/db/schema";
import type { ProposedAnnotation } from "@/lib/quirk/agents/types";
import type { OfferWithAsset } from "@/lib/quirk/offers";
import type { GoldilocksReading } from "@/lib/quirk/goldilocks";

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
  QuirkOffer,
  OfferWithAsset,
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
  listAssets: (status?: string, q?: string) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    const qs = params.toString();
    return request<{ assets: AssetSummary[] }>(
      `/api/assets${qs ? `?${qs}` : ""}`,
    );
  },
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
  publishAsset: (id: string) =>
    request<{ asset: QuirkAsset }>(`/api/assets/${id}/publish`, {
      method: "POST",
    }),
  batchCapture: (items: Record<string, unknown>[]) =>
    request<{
      captured: { asset: QuirkAsset; version: QuirkAssetVersion }[];
      errors: { index: number; error: string }[];
    }>("/api/assets/batch", {
      method: "POST",
      body: JSON.stringify({ items }),
    }),
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
    request<{
      run: QuirkRun;
      offer: QuirkOffer | null;
      goldilocks: GoldilocksReading;
    }>(`/api/runs/${id}/promote`, { method: "POST" }),
  autoPromoteExperiment: (
    experimentId: string,
    qualityThreshold?: number,
  ) =>
    request<{
      run: QuirkRun;
      offer: QuirkOffer | null;
      goldilocks: GoldilocksReading;
    }>(`/api/experiments/${experimentId}/auto-promote`, {
      method: "POST",
      body: JSON.stringify(
        qualityThreshold != null ? { qualityThreshold } : {},
      ),
    }),
  listOffers: (status?: string) =>
    request<{ offers: OfferWithAsset[] }>(
      `/api/offers${status ? `?status=${status}` : ""}`,
    ),
  mintOffer: (body: { assetId: string; register?: string }) =>
    request<{ offer: OfferWithAsset }>("/api/offers", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  claimOffer: (id: string) =>
    request<{ offer: QuirkOffer }>(`/api/offers/${id}/claim`, {
      method: "POST",
    }),
  retireOffer: (id: string) =>
    request<{ offer: QuirkOffer }>(`/api/offers/${id}/retire`, {
      method: "POST",
    }),
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
