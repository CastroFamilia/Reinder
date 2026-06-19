-- Migration: Listing Lifecycle — sold_at, agency_id on profiles, auto-remove job
-- Story 5.4: Ciclo de Vida del Listing — Retirada y Vendida
-- Created: 2026-06-19

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 1: Add sold_at column to listings table
-- Used by the auto-removal job to determine when to expire sold listings
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings'
      AND column_name = 'sold_at'
  ) THEN
    ALTER TABLE listings ADD COLUMN sold_at TIMESTAMPTZ;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 2: Add agency_id column to user_profiles table
-- Links agency admins/agents to their agency for ownership guards.
-- The worktree 5.4 route relied on this column but it didn't exist — BUG FIX.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
      AND column_name = 'agency_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN agency_id UUID;

    ALTER TABLE user_profiles
    ADD CONSTRAINT user_profiles_agency_id_agencies_id_fk
    FOREIGN KEY (agency_id) REFERENCES agencies(id)
    ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

-- Index for fast lookups of users by agency
CREATE INDEX IF NOT EXISTS idx_user_profiles_agency_id
  ON user_profiles USING btree (agency_id)
  WHERE agency_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTION: auto_remove_sold_listings()
-- Marks listings with status = 'sold' AND sold_at < NOW() - 72h as 'withdrawn'.
-- These listings will then disappear from the swipe feed (feed filters withdrawn).
-- Called by pg_cron every hour.
-- FR27: sold listings visible 72h then auto-removed
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION auto_remove_sold_listings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  removed_count INTEGER;
BEGIN
  -- Mark sold listings older than 72h as withdrawn
  -- withdrawn listings are automatically filtered from the swipe feed
  WITH removed AS (
    UPDATE listings
    SET
      status = 'withdrawn',
      updated_at = NOW()
    WHERE
      status = 'sold'
      AND sold_at IS NOT NULL
      AND sold_at < NOW() - INTERVAL '72 hours'
    RETURNING id, agency_id, title
  )
  SELECT COUNT(*) INTO removed_count FROM removed;

  IF removed_count > 0 THEN
    RAISE LOG '[lifecycle] auto_remove_sold_listings: % listings expired and set to withdrawn', removed_count;
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- pg_cron Job: Run auto_remove_sold_listings() every hour
-- Checks for sold listings past 72h and removes them from the feed
-- ─────────────────────────────────────────────────────────────────────────────

SELECT cron.schedule(
  'auto-remove-sold-listings',
  '0 * * * *',
  'SELECT auto_remove_sold_listings()'
);
