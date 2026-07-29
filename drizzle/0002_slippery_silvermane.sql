CREATE TYPE "public"."quirk_offer_status" AS ENUM('open', 'claimed', 'retired');--> statement-breakpoint
CREATE TABLE "quirk_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"title" text NOT NULL,
	"pitch" text NOT NULL,
	"register" text,
	"scores" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "quirk_offer_status" DEFAULT 'open' NOT NULL,
	"claimed_by" uuid,
	"claimed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quirk_offers_asset_uq" UNIQUE("asset_id")
);
--> statement-breakpoint
ALTER TABLE "quirk_offers" ADD CONSTRAINT "quirk_offers_asset_id_quirk_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."quirk_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quirk_offers" ADD CONSTRAINT "quirk_offers_claimed_by_users_id_fk" FOREIGN KEY ("claimed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quirk_offers_status_idx" ON "quirk_offers" USING btree ("status");