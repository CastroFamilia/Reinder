-- Story 2.9: Add search_preferences column to user_profiles
-- Migration: 0001_add_search_preferences.sql

ALTER TABLE "user_profiles"
  ADD COLUMN IF NOT EXISTS "search_preferences" jsonb DEFAULT NULL;

COMMENT ON COLUMN "user_profiles"."search_preferences" IS
  'SearchPreferences JSON: { zones: string[], maxPrice?: number, minRooms?: number, minSqm?: number }';
