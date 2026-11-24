ALTER TABLE "quirk_assets" ADD COLUMN "embedding_model" text;--> statement-breakpoint
-- Existing vectors predate provenance tracking, and which embedder produced
-- them cannot be recovered after the fact: the offline hash fallback and a
-- provider model write the same width to the same column. Mark them 'unknown'
-- rather than guessing. 'unknown' matches no configured model, so similarity
-- search skips these rows and embedPendingAssets() re-embeds them on its next
-- run.
UPDATE "quirk_assets" SET "embedding_model" = 'unknown' WHERE "embedding" IS NOT NULL AND "embedding_model" IS NULL;--> statement-breakpoint
CREATE INDEX "quirk_assets_embedding_model_idx" ON "quirk_assets" USING btree ("embedding_model");--> statement-breakpoint
CREATE INDEX "quirk_assets_embedding_hnsw_idx" ON "quirk_assets" USING hnsw ("embedding" vector_cosine_ops);