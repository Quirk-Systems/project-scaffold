CREATE SCHEMA "ontology";
--> statement-breakpoint
REVOKE ALL ON SCHEMA "ontology" FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA "ontology"
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
--> statement-breakpoint
CREATE TABLE "ontology"."aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"namespace" text NOT NULL,
	"alias" text NOT NULL,
	"ambiguity_record" jsonb,
	CONSTRAINT "ontology_aliases_entity_alias_uq" UNIQUE("entity_id","alias")
);
--> statement-breakpoint
CREATE TABLE "ontology"."change_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canonical_id" text NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"proposed_payload" jsonb NOT NULL,
	"requested_by" text NOT NULL,
	"approved_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ontology"."constraints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canonical_name" text NOT NULL,
	"description" text NOT NULL,
	"rule" jsonb NOT NULL,
	"authority_level" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "constraints_canonical_name_unique" UNIQUE("canonical_name")
);
--> statement-breakpoint
CREATE TABLE "ontology"."entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canonical_id" text NOT NULL,
	"namespace" text NOT NULL,
	"canonical_name" text NOT NULL,
	"primary_type_id" uuid NOT NULL,
	"truth_status" text NOT NULL,
	"lifecycle_status" text NOT NULL,
	"authority_level" text NOT NULL,
	"canonical_path" text NOT NULL,
	"content_hash" text NOT NULL,
	"schema_version" integer NOT NULL,
	"current_version" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"commit_sha" text NOT NULL,
	"projected_at" timestamp with time zone NOT NULL,
	CONSTRAINT "entities_canonical_id_unique" UNIQUE("canonical_id"),
	CONSTRAINT "ontology_entities_schema_version_check" CHECK ("ontology"."entities"."schema_version" > 0),
	CONSTRAINT "ontology_entities_current_version_check" CHECK ("ontology"."entities"."current_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "ontology"."entity_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canonical_name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entity_types_canonical_name_unique" UNIQUE("canonical_name")
);
--> statement-breakpoint
CREATE TABLE "ontology"."entity_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"content_hash" text NOT NULL,
	"payload" jsonb NOT NULL,
	"change_summary" text,
	"commit_sha" text NOT NULL,
	"projected_at" timestamp with time zone NOT NULL,
	CONSTRAINT "ontology_entity_versions_entity_version_uq" UNIQUE("entity_id","version")
);
--> statement-breakpoint
CREATE TABLE "ontology"."evidence_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"evidence_type" text NOT NULL,
	"uri" text NOT NULL,
	"content_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ontology"."lint_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projection_run_id" uuid NOT NULL,
	"canonical_id" text,
	"code" text NOT NULL,
	"message" text NOT NULL,
	"severity" text DEFAULT 'error' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ontology"."projection_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commit_sha" text NOT NULL,
	"status" text NOT NULL,
	"entity_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ontology"."relation_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canonical_name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "relation_types_canonical_name_unique" UNIQUE("canonical_name")
);
--> statement-breakpoint
CREATE TABLE "ontology"."relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_entity_id" uuid NOT NULL,
	"relation_type_id" uuid NOT NULL,
	"object_entity_id" uuid,
	"object_canonical_id" text NOT NULL,
	"is_external" boolean DEFAULT false NOT NULL,
	"qualifiers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_path" text NOT NULL,
	"content_hash" text NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_to" timestamp with time zone,
	CONSTRAINT "ontology_relations_content_uq" UNIQUE("subject_entity_id","relation_type_id","object_canonical_id","content_hash"),
	CONSTRAINT "ontology_relations_target_check" CHECK ("ontology"."relations"."is_external" or "ontology"."relations"."object_entity_id" is not null)
);
--> statement-breakpoint
ALTER TABLE "ontology"."aliases" ADD CONSTRAINT "aliases_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "ontology"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ontology"."entities" ADD CONSTRAINT "entities_primary_type_id_entity_types_id_fk" FOREIGN KEY ("primary_type_id") REFERENCES "ontology"."entity_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ontology"."entity_versions" ADD CONSTRAINT "entity_versions_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "ontology"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ontology"."evidence_links" ADD CONSTRAINT "evidence_links_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "ontology"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ontology"."lint_findings" ADD CONSTRAINT "lint_findings_projection_run_id_projection_runs_id_fk" FOREIGN KEY ("projection_run_id") REFERENCES "ontology"."projection_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ontology"."relations" ADD CONSTRAINT "relations_subject_entity_id_entities_id_fk" FOREIGN KEY ("subject_entity_id") REFERENCES "ontology"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ontology"."relations" ADD CONSTRAINT "relations_relation_type_id_relation_types_id_fk" FOREIGN KEY ("relation_type_id") REFERENCES "ontology"."relation_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ontology"."relations" ADD CONSTRAINT "relations_object_entity_id_entities_id_fk" FOREIGN KEY ("object_entity_id") REFERENCES "ontology"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ontology_aliases_entity_idx" ON "ontology"."aliases" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "ontology_aliases_lookup_idx" ON "ontology"."aliases" USING btree ("namespace",lower("alias"));--> statement-breakpoint
CREATE INDEX "ontology_change_requests_canonical_idx" ON "ontology"."change_requests" USING btree ("canonical_id","status");--> statement-breakpoint
CREATE INDEX "ontology_entities_primary_type_idx" ON "ontology"."entities" USING btree ("primary_type_id");--> statement-breakpoint
CREATE INDEX "ontology_entities_namespace_idx" ON "ontology"."entities" USING btree ("namespace");--> statement-breakpoint
CREATE INDEX "ontology_entity_versions_entity_idx" ON "ontology"."entity_versions" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "ontology_evidence_links_entity_idx" ON "ontology"."evidence_links" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "ontology_lint_findings_run_idx" ON "ontology"."lint_findings" USING btree ("projection_run_id");--> statement-breakpoint
CREATE INDEX "ontology_relations_subject_idx" ON "ontology"."relations" USING btree ("subject_entity_id");--> statement-breakpoint
CREATE INDEX "ontology_relations_type_idx" ON "ontology"."relations" USING btree ("relation_type_id");--> statement-breakpoint
CREATE INDEX "ontology_relations_object_idx" ON "ontology"."relations" USING btree ("object_entity_id");--> statement-breakpoint
CREATE INDEX "quirk_asset_versions_asset_idx" ON "quirk_asset_versions" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "quirk_diffs_asset_idx" ON "quirk_diffs" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "quirk_diffs_from_version_idx" ON "quirk_diffs" USING btree ("from_version_id");--> statement-breakpoint
CREATE INDEX "quirk_diffs_to_version_idx" ON "quirk_diffs" USING btree ("to_version_id");--> statement-breakpoint
CREATE INDEX "quirk_offers_claimed_by_idx" ON "quirk_offers" USING btree ("claimed_by");--> statement-breakpoint
CREATE INDEX "quirk_pipeline_runs_pipeline_idx" ON "quirk_pipeline_runs" USING btree ("pipeline_id");--> statement-breakpoint
CREATE INDEX "quirk_pipeline_runs_asset_idx" ON "quirk_pipeline_runs" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "quirk_pipeline_steps_pipeline_idx" ON "quirk_pipeline_steps" USING btree ("pipeline_id");--> statement-breakpoint
CREATE INDEX "quirk_runs_input_asset_idx" ON "quirk_runs" USING btree ("input_asset_id");--> statement-breakpoint
CREATE INDEX "quirk_runs_output_asset_idx" ON "quirk_runs" USING btree ("output_asset_id");--> statement-breakpoint
CREATE INDEX "subscriptions_user_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_customer_idx" ON "subscriptions" USING btree ("customer_id");--> statement-breakpoint
-- The legacy SECURITY DEFINER helper is administrative, not a client API.
DO $$
DECLARE
	helper regprocedure;
	role_name text;
BEGIN
	FOR helper IN
		SELECT p.oid::regprocedure
		FROM pg_proc p
		JOIN pg_namespace n ON n.oid = p.pronamespace
		WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable'
	LOOP
		EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', helper);
		FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated']
		LOOP
			IF EXISTS (SELECT 1 FROM pg_roles WHERE pg_roles.rolname = role_name) THEN
				EXECUTE format(
					'REVOKE ALL ON FUNCTION %s FROM %I',
					helper,
					role_name
				);
			END IF;
		END LOOP;
	END LOOP;
END
$$;--> statement-breakpoint
DO $$
DECLARE
	table_name text;
	role_name text;
BEGIN
	FOREACH table_name IN ARRAY ARRAY[
		'users', 'customers', 'subscriptions', 'quirk_assets',
		'quirk_asset_versions', 'quirk_annotations', 'quirk_tags',
		'quirk_diffs', 'quirk_experiments', 'quirk_runs',
		'quirk_pipelines', 'quirk_pipeline_steps', 'quirk_pipeline_runs',
		'quirk_offers'
	]
	LOOP
		EXECUTE format(
			'ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY',
			table_name
		);
		FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated']
		LOOP
			IF EXISTS (SELECT 1 FROM pg_roles WHERE pg_roles.rolname = role_name) THEN
				EXECUTE format(
					'REVOKE ALL ON TABLE public.%I FROM %I',
					table_name,
					role_name
				);
			END IF;
		END LOOP;
	END LOOP;

	FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated']
	LOOP
		IF EXISTS (SELECT 1 FROM pg_roles WHERE pg_roles.rolname = role_name) THEN
			EXECUTE format('REVOKE ALL ON SCHEMA ontology FROM %I', role_name);
			EXECUTE format(
				'REVOKE ALL ON ALL TABLES IN SCHEMA ontology FROM %I',
				role_name
			);
			EXECUTE format(
				'REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ontology FROM %I',
				role_name
			);
		END IF;
	END LOOP;
END
$$;