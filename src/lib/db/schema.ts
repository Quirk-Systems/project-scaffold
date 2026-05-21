import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  jsonb,
  doublePrecision,
  timestamp,
  vector,
  unique,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const assetTypeEnum = pgEnum("quirk_asset_type", [
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
]);

export const assetStatusEnum = pgEnum("quirk_asset_status", [
  "captured",
  "annotated",
  "mutated",
  "approved",
  "published",
  "rejected",
]);

export const annotationTypeEnum = pgEnum("quirk_annotation_type", [
  "tag",
  "rating",
  "comment",
  "persona_fit",
  "spawn_path",
  "risk",
  "quality",
  "theme",
]);

export const experimentTypeEnum = pgEnum("quirk_experiment_type", [
  "prompt",
  "song",
  "image",
  "agent",
  "workflow",
  "ui",
  "dataset",
]);

export const experimentStatusEnum = pgEnum("quirk_experiment_status", [
  "running",
  "completed",
  "archived",
]);

export const runOutcomeEnum = pgEnum("quirk_run_outcome", [
  "pending",
  "winner",
  "reject",
  "mutate_again",
]);

export const pipelineStatusEnum = pgEnum("quirk_pipeline_status", [
  "active",
  "archived",
]);

export const pipelineRunStatusEnum = pgEnum("quirk_pipeline_run_status", [
  "queued",
  "running",
  "paused",
  "completed",
  "failed",
]);

// ---------------------------------------------------------------------------
// Auth (carried over from the scaffold)
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// 1. Quirk Data Engine — Unstructured Asset Registry
// ---------------------------------------------------------------------------

export const quirkAssets = pgTable(
  "quirk_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title"),
    assetType: assetTypeEnum("asset_type").notNull(),
    sourceUrl: text("source_url"),
    storagePath: text("storage_path"),
    rawText: text("raw_text"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    embedding: vector("embedding", { dimensions: 1536 }),
    status: assetStatusEnum("status").notNull().default("captured"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("quirk_assets_status_idx").on(t.status)],
);

export const quirkAssetVersions = pgTable(
  "quirk_asset_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => quirkAssets.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    changeSummary: text("change_summary"),
    contentSnapshot: jsonb("content_snapshot")
      .$type<Record<string, unknown>>()
      .notNull(),
    createdBy: text("created_by").notNull().default("system"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("quirk_asset_versions_asset_version_uq").on(
      t.assetId,
      t.versionNumber,
    ),
  ],
);

// ---------------------------------------------------------------------------
// 2. Curation & Annotation Chamber
// ---------------------------------------------------------------------------

export const quirkAnnotations = pgTable(
  "quirk_annotations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => quirkAssets.id, { onDelete: "cascade" }),
    annotator: text("annotator").notNull(),
    annotationType: annotationTypeEnum("annotation_type").notNull(),
    label: text("label"),
    value: jsonb("value")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    confidence: doublePrecision("confidence"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("quirk_annotations_asset_idx").on(t.assetId),
    check(
      "quirk_annotations_confidence_range",
      sql`${t.confidence} is null or (${t.confidence} >= 0 and ${t.confidence} <= 1)`,
    ),
  ],
);

export const quirkTags = pgTable("quirk_tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  category: text("category"),
  description: text("description"),
});

// ---------------------------------------------------------------------------
// 3. Quirk Diff — Semantic Version Control
// ---------------------------------------------------------------------------

export const quirkDiffs = pgTable("quirk_diffs", {
  id: uuid("id").primaryKey().defaultRandom(),
  assetId: uuid("asset_id")
    .notNull()
    .references(() => quirkAssets.id, { onDelete: "cascade" }),
  fromVersionId: uuid("from_version_id").references(
    () => quirkAssetVersions.id,
  ),
  toVersionId: uuid("to_version_id").references(() => quirkAssetVersions.id),
  diffType: text("diff_type").notNull().default("semantic"),
  summary: text("summary"),
  additions: jsonb("additions").$type<string[]>().notNull().default([]),
  removals: jsonb("removals").$type<string[]>().notNull().default([]),
  meaningShift: jsonb("meaning_shift")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  scoreDelta: jsonb("score_delta")
    .$type<Record<string, number>>()
    .notNull()
    .default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// 4. Experiment Tracking
// ---------------------------------------------------------------------------

export const quirkExperiments = pgTable("quirk_experiments", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  experimentType: experimentTypeEnum("experiment_type").notNull(),
  objective: text("objective"),
  status: experimentStatusEnum("status").notNull().default("running"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const quirkRuns = pgTable(
  "quirk_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    experimentId: uuid("experiment_id")
      .notNull()
      .references(() => quirkExperiments.id, { onDelete: "cascade" }),
    inputAssetId: uuid("input_asset_id").references(() => quirkAssets.id),
    model: text("model"),
    persona: text("persona"),
    mask: text("mask"),
    prompt: text("prompt"),
    parameters: jsonb("parameters")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    outputAssetId: uuid("output_asset_id").references(() => quirkAssets.id),
    metrics: jsonb("metrics")
      .$type<Record<string, number>>()
      .notNull()
      .default({}),
    score: doublePrecision("score"),
    outcome: runOutcomeEnum("outcome").notNull().default("pending"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("quirk_runs_experiment_idx").on(t.experimentId)],
);

// ---------------------------------------------------------------------------
// 5. Pipeline Map + Automation Forge
// ---------------------------------------------------------------------------

export const quirkPipelines = pgTable("quirk_pipelines", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  version: integer("version").notNull().default(1),
  status: pipelineStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const quirkPipelineSteps = pgTable(
  "quirk_pipeline_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pipelineId: uuid("pipeline_id")
      .notNull()
      .references(() => quirkPipelines.id, { onDelete: "cascade" }),
    stepOrder: integer("step_order").notNull(),
    stepKey: text("step_key").notNull(),
    stepName: text("step_name").notNull(),
    agentRole: text("agent_role"),
    config: jsonb("config")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("quirk_pipeline_steps_order_uq").on(t.pipelineId, t.stepOrder),
  ],
);

export const quirkPipelineRuns = pgTable("quirk_pipeline_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  pipelineId: uuid("pipeline_id")
    .notNull()
    .references(() => quirkPipelines.id, { onDelete: "cascade" }),
  assetId: uuid("asset_id").references(() => quirkAssets.id),
  status: pipelineRunStatusEnum("status").notNull().default("queued"),
  currentStep: text("current_step"),
  logs: jsonb("logs").$type<PipelineLogEntry[]>().notNull().default([]),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// Shared row types
// ---------------------------------------------------------------------------

export type PipelineLogEntry = {
  step: string;
  status: "started" | "completed" | "halted" | "failed";
  agentRole?: string;
  message: string;
  at: string;
};

export type QuirkAsset = typeof quirkAssets.$inferSelect;
export type NewQuirkAsset = typeof quirkAssets.$inferInsert;
export type QuirkAssetVersion = typeof quirkAssetVersions.$inferSelect;
export type QuirkAnnotation = typeof quirkAnnotations.$inferSelect;
export type NewQuirkAnnotation = typeof quirkAnnotations.$inferInsert;
export type QuirkDiff = typeof quirkDiffs.$inferSelect;
export type QuirkExperiment = typeof quirkExperiments.$inferSelect;
export type QuirkRun = typeof quirkRuns.$inferSelect;
export type QuirkPipeline = typeof quirkPipelines.$inferSelect;
export type QuirkPipelineStep = typeof quirkPipelineSteps.$inferSelect;
export type QuirkPipelineRun = typeof quirkPipelineRuns.$inferSelect;
