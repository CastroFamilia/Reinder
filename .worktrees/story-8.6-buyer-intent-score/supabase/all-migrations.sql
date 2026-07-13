CREATE TYPE "public"."app_role" AS ENUM('buyer', 'agent', 'agency_admin', 'platform_admin');;
CREATE TABLE "agencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
;
CREATE TABLE "agency_crm_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"crm_type" text NOT NULL,
	"credentials_encrypted" text,
	"status" text DEFAULT 'pending_sync' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
;
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"external_id" text,
	"title" text NOT NULL,
	"description" text,
	"price" numeric(15, 2),
	"currency" char(3) DEFAULT 'EUR' NOT NULL,
	"bedrooms" integer,
	"size_sqm" numeric(10, 2),
	"address" text,
	"city" text,
	"country" text,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"images" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"exclusivity_verified" boolean DEFAULT false NOT NULL,
	"catastral_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
;
CREATE TABLE "match_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"agent_id" uuid,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
;
CREATE TABLE "push_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"platform" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
;
CREATE TABLE "referral_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"buyer_id" uuid,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_tokens_token_unique" UNIQUE("token")
);
;
CREATE TABLE "swipe_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"action" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
;
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"role" "app_role" DEFAULT 'buyer' NOT NULL,
	"full_name" text,
	"avatar_url" text,
	"terms_accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
;
ALTER TABLE "agency_crm_connections" ADD CONSTRAINT "agency_crm_connections_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE no action ON UPDATE no action;;
ALTER TABLE "listings" ADD CONSTRAINT "listings_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE no action ON UPDATE no action;;
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;;
ALTER TABLE "swipe_events" ADD CONSTRAINT "swipe_events_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;;
CREATE INDEX "idx_listings_agency_id" ON "listings" USING btree ("agency_id");;
CREATE INDEX "idx_push_tokens_user_id" ON "push_tokens" USING btree ("user_id");;
CREATE INDEX "idx_referral_tokens_token" ON "referral_tokens" USING btree ("token");;
CREATE INDEX "idx_swipe_events_buyer_id" ON "swipe_events" USING btree ("buyer_id");-- Story 2.9: Add search_preferences column to user_profiles
-- Migration: 0001_add_search_preferences.sql

ALTER TABLE "user_profiles"
  ADD COLUMN IF NOT EXISTS "search_preferences" jsonb DEFAULT NULL;

COMMENT ON COLUMN "user_profiles"."search_preferences" IS
  'SearchPreferences JSON: { zones: string[], maxPrice?: number, minRooms?: number, minSqm?: number }';
-- Story 4.1: Lista de Clientes Vinculados en el Panel del Agente
-- Adds agent_last_seen_at to agent_buyer_bonds table.
-- Used to compute hasNewMatches (whether agent has seen latest match for a client).
-- Nullable: NULL means the agent has never viewed this client's match history.

ALTER TABLE "agent_buyer_bonds" ADD COLUMN IF NOT EXISTS "agent_last_seen_at" TIMESTAMPTZ;
