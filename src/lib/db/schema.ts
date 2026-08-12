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
  boolean,
  pgSchema,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type Stripe from "stripe";

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
// Billing (Stripe)
// ---------------------------------------------------------------------------

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
    stripePriceId: text("stripe_price_id").notNull(),
    status: text("status").notNull().$type<Stripe.Subscription.Status>(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("subscriptions_user_idx").on(t.userId),
    index("subscriptions_customer_idx").on(t.customerId),
  ],
);

// ---------------------------------------------------------------------------
// 1. Quirk Data Engine — Unstructured Asset Registry
// ---------------------------------------------------------------------------

/**
 * Width of the `quirk_assets.embedding` pgvector column. Declared here, next
 * to the column itself, because an embedder that produces a different width
 * fails at insert time rather than at compile time.
 */
export const EMBEDDING_DIMENSIONS = 1536;

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
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }),
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
    index("quirk_asset_versions_asset_idx").on(t.assetId),
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

export const quirkDiffs = pgTable(
  "quirk_diffs",
  {
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
  },
  (t) => [
    index("quirk_diffs_asset_idx").on(t.assetId),
    index("quirk_diffs_from_version_idx").on(t.fromVersionId),
    index("quirk_diffs_to_version_idx").on(t.toVersionId),
  ],
);

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
  (t) => [
    index("quirk_runs_experiment_idx").on(t.experimentId),
    index("quirk_runs_input_asset_idx").on(t.inputAssetId),
    index("quirk_runs_output_asset_idx").on(t.outputAssetId),
  ],
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
    index("quirk_pipeline_steps_pipeline_idx").on(t.pipelineId),
  ],
);

export const quirkPipelineRuns = pgTable(
  "quirk_pipeline_runs",
  {
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
  },
  (t) => [
    index("quirk_pipeline_runs_pipeline_idx").on(t.pipelineId),
    index("quirk_pipeline_runs_asset_idx").on(t.assetId),
  ],
);

// ---------------------------------------------------------------------------
// 6. Quirk Offers — one-of-one claimable drops
// ---------------------------------------------------------------------------

export const offerStatusEnum = pgEnum("quirk_offer_status", [
  "open",
  "claimed",
  "retired",
]);

export const quirkOffers = pgTable(
  "quirk_offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => quirkAssets.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    // Persona-voiced pitch copy (AI when configured, heuristic otherwise).
    pitch: text("pitch").notNull(),
    register: text("register"),
    scores: jsonb("scores")
      .$type<Record<string, number>>()
      .notNull()
      .default({}),
    status: offerStatusEnum("status").notNull().default("open"),
    claimedBy: uuid("claimed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("quirk_offers_status_idx").on(t.status),
    index("quirk_offers_claimed_by_idx").on(t.claimedBy),
    // One offer per asset — the 1/1 is minted once, ever.
    unique("quirk_offers_asset_uq").on(t.assetId),
  ],
);

// ---------------------------------------------------------------------------
// Private Ontology Projection — Git remains canonical
// ---------------------------------------------------------------------------

export const ontologySchema = pgSchema("ontology");

export const ontologyEntityTypes = ontologySchema.table("entity_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  canonicalName: text("canonical_name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const ontologyRelationTypes = ontologySchema.table("relation_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  canonicalName: text("canonical_name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const ontologyEntities = ontologySchema.table(
  "entities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    canonicalId: text("canonical_id").notNull().unique(),
    namespace: text("namespace").notNull(),
    canonicalName: text("canonical_name").notNull(),
    primaryTypeId: uuid("primary_type_id")
      .notNull()
      .references(() => ontologyEntityTypes.id),
    truthStatus: text("truth_status").notNull(),
    lifecycleStatus: text("lifecycle_status").notNull(),
    authorityLevel: text("authority_level").notNull(),
    canonicalPath: text("canonical_path").notNull(),
    contentHash: text("content_hash").notNull(),
    schemaVersion: integer("schema_version").notNull(),
    currentVersion: integer("current_version").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    commitSha: text("commit_sha").notNull(),
    projectedAt: timestamp("projected_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("ontology_entities_primary_type_idx").on(t.primaryTypeId),
    index("ontology_entities_namespace_idx").on(t.namespace),
    check(
      "ontology_entities_schema_version_check",
      sql`${t.schemaVersion} > 0`,
    ),
    check(
      "ontology_entities_current_version_check",
      sql`${t.currentVersion} > 0`,
    ),
  ],
);

export const ontologyEntityVersions = ontologySchema.table(
  "entity_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => ontologyEntities.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    contentHash: text("content_hash").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    changeSummary: text("change_summary"),
    commitSha: text("commit_sha").notNull(),
    projectedAt: timestamp("projected_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    unique("ontology_entity_versions_entity_version_uq").on(
      t.entityId,
      t.version,
    ),
    index("ontology_entity_versions_entity_idx").on(t.entityId),
  ],
);

export const ontologyRelations = ontologySchema.table(
  "relations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectEntityId: uuid("subject_entity_id")
      .notNull()
      .references(() => ontologyEntities.id, { onDelete: "cascade" }),
    relationTypeId: uuid("relation_type_id")
      .notNull()
      .references(() => ontologyRelationTypes.id),
    objectEntityId: uuid("object_entity_id").references(
      () => ontologyEntities.id,
    ),
    objectCanonicalId: text("object_canonical_id").notNull(),
    isExternal: boolean("is_external").notNull().default(false),
    qualifiers: jsonb("qualifiers")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    sourcePath: text("source_path").notNull(),
    contentHash: text("content_hash").notNull(),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validTo: timestamp("valid_to", { withTimezone: true }),
  },
  (t) => [
    unique("ontology_relations_content_uq").on(
      t.subjectEntityId,
      t.relationTypeId,
      t.objectCanonicalId,
      t.contentHash,
    ),
    index("ontology_relations_subject_idx").on(t.subjectEntityId),
    index("ontology_relations_type_idx").on(t.relationTypeId),
    index("ontology_relations_object_idx").on(t.objectEntityId),
    check(
      "ontology_relations_target_check",
      sql`${t.isExternal} or ${t.objectEntityId} is not null`,
    ),
  ],
);

export const ontologyAliases = ontologySchema.table(
  "aliases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => ontologyEntities.id, { onDelete: "cascade" }),
    namespace: text("namespace").notNull(),
    alias: text("alias").notNull(),
    ambiguityRecord: jsonb("ambiguity_record").$type<Record<string, unknown>>(),
  },
  (t) => [
    unique("ontology_aliases_entity_alias_uq").on(t.entityId, t.alias),
    index("ontology_aliases_entity_idx").on(t.entityId),
    index("ontology_aliases_lookup_idx").on(
      t.namespace,
      sql`lower(${t.alias})`,
    ),
  ],
);

export const ontologyConstraints = ontologySchema.table("constraints", {
  id: uuid("id").primaryKey().defaultRandom(),
  canonicalName: text("canonical_name").notNull().unique(),
  description: text("description").notNull(),
  rule: jsonb("rule").$type<Record<string, unknown>>().notNull(),
  authorityLevel: text("authority_level").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const ontologyEvidenceLinks = ontologySchema.table(
  "evidence_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => ontologyEntities.id, { onDelete: "cascade" }),
    evidenceType: text("evidence_type").notNull(),
    uri: text("uri").notNull(),
    contentHash: text("content_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("ontology_evidence_links_entity_idx").on(t.entityId)],
);

export const ontologyChangeRequests = ontologySchema.table(
  "change_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    canonicalId: text("canonical_id").notNull(),
    status: text("status").notNull().default("proposed"),
    proposedPayload: jsonb("proposed_payload")
      .$type<Record<string, unknown>>()
      .notNull(),
    requestedBy: text("requested_by").notNull(),
    approvedBy: text("approved_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [
    index("ontology_change_requests_canonical_idx").on(t.canonicalId, t.status),
  ],
);

export const ontologyProjectionRuns = ontologySchema.table("projection_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  commitSha: text("commit_sha").notNull(),
  status: text("status").notNull(),
  entityCount: integer("entity_count").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const ontologyLintFindings = ontologySchema.table(
  "lint_findings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectionRunId: uuid("projection_run_id")
      .notNull()
      .references(() => ontologyProjectionRuns.id, { onDelete: "cascade" }),
    canonicalId: text("canonical_id"),
    code: text("code").notNull(),
    message: text("message").notNull(),
    severity: text("severity").notNull().default("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("ontology_lint_findings_run_idx").on(t.projectionRunId)],
);

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
export type QuirkOffer = typeof quirkOffers.$inferSelect;
