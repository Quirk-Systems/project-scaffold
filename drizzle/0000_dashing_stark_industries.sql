CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."quirk_annotation_type" AS ENUM('tag', 'rating', 'comment', 'persona_fit', 'spawn_path', 'risk', 'quality', 'theme');--> statement-breakpoint
CREATE TYPE "public"."quirk_asset_status" AS ENUM('captured', 'annotated', 'mutated', 'approved', 'published', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."quirk_asset_type" AS ENUM('text', 'image', 'audio', 'video', 'pdf', 'web_clip', 'prompt', 'song', 'dataset', 'other');--> statement-breakpoint
CREATE TYPE "public"."quirk_experiment_status" AS ENUM('running', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."quirk_experiment_type" AS ENUM('prompt', 'song', 'image', 'agent', 'workflow', 'ui', 'dataset');--> statement-breakpoint
CREATE TYPE "public"."quirk_pipeline_run_status" AS ENUM('queued', 'running', 'paused', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."quirk_pipeline_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."quirk_run_outcome" AS ENUM('pending', 'winner', 'reject', 'mutate_again');--> statement-breakpoint
CREATE TABLE "quirk_annotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"annotator" text NOT NULL,
	"annotation_type" "quirk_annotation_type" NOT NULL,
	"label" text,
	"value" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"confidence" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quirk_annotations_confidence_range" CHECK ("quirk_annotations"."confidence" is null or ("quirk_annotations"."confidence" >= 0 and "quirk_annotations"."confidence" <= 1))
);
--> statement-breakpoint
CREATE TABLE "quirk_asset_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"change_summary" text,
	"content_snapshot" jsonb NOT NULL,
	"created_by" text DEFAULT 'system' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quirk_asset_versions_asset_version_uq" UNIQUE("asset_id","version_number")
);
--> statement-breakpoint
CREATE TABLE "quirk_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"asset_type" "quirk_asset_type" NOT NULL,
	"source_url" text,
	"storage_path" text,
	"raw_text" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"embedding" vector(1536),
	"status" "quirk_asset_status" DEFAULT 'captured' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quirk_diffs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"from_version_id" uuid,
	"to_version_id" uuid,
	"diff_type" text DEFAULT 'semantic' NOT NULL,
	"summary" text,
	"additions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"removals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"meaning_shift" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"score_delta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quirk_experiments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"experiment_type" "quirk_experiment_type" NOT NULL,
	"objective" text,
	"status" "quirk_experiment_status" DEFAULT 'running' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quirk_pipeline_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipeline_id" uuid NOT NULL,
	"asset_id" uuid,
	"status" "quirk_pipeline_run_status" DEFAULT 'queued' NOT NULL,
	"current_step" text,
	"logs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "quirk_pipeline_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipeline_id" uuid NOT NULL,
	"step_order" integer NOT NULL,
	"step_key" text NOT NULL,
	"step_name" text NOT NULL,
	"agent_role" text,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quirk_pipeline_steps_order_uq" UNIQUE("pipeline_id","step_order")
);
--> statement-breakpoint
CREATE TABLE "quirk_pipelines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "quirk_pipeline_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quirk_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experiment_id" uuid NOT NULL,
	"input_asset_id" uuid,
	"model" text,
	"persona" text,
	"mask" text,
	"prompt" text,
	"parameters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"output_asset_id" uuid,
	"metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"score" double precision,
	"outcome" "quirk_run_outcome" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quirk_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"description" text,
	CONSTRAINT "quirk_tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"password_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "quirk_annotations" ADD CONSTRAINT "quirk_annotations_asset_id_quirk_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."quirk_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quirk_asset_versions" ADD CONSTRAINT "quirk_asset_versions_asset_id_quirk_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."quirk_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quirk_diffs" ADD CONSTRAINT "quirk_diffs_asset_id_quirk_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."quirk_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quirk_diffs" ADD CONSTRAINT "quirk_diffs_from_version_id_quirk_asset_versions_id_fk" FOREIGN KEY ("from_version_id") REFERENCES "public"."quirk_asset_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quirk_diffs" ADD CONSTRAINT "quirk_diffs_to_version_id_quirk_asset_versions_id_fk" FOREIGN KEY ("to_version_id") REFERENCES "public"."quirk_asset_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quirk_pipeline_runs" ADD CONSTRAINT "quirk_pipeline_runs_pipeline_id_quirk_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."quirk_pipelines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quirk_pipeline_runs" ADD CONSTRAINT "quirk_pipeline_runs_asset_id_quirk_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."quirk_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quirk_pipeline_steps" ADD CONSTRAINT "quirk_pipeline_steps_pipeline_id_quirk_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."quirk_pipelines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quirk_runs" ADD CONSTRAINT "quirk_runs_experiment_id_quirk_experiments_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."quirk_experiments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quirk_runs" ADD CONSTRAINT "quirk_runs_input_asset_id_quirk_assets_id_fk" FOREIGN KEY ("input_asset_id") REFERENCES "public"."quirk_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quirk_runs" ADD CONSTRAINT "quirk_runs_output_asset_id_quirk_assets_id_fk" FOREIGN KEY ("output_asset_id") REFERENCES "public"."quirk_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quirk_annotations_asset_idx" ON "quirk_annotations" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "quirk_assets_status_idx" ON "quirk_assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "quirk_runs_experiment_idx" ON "quirk_runs" USING btree ("experiment_id");