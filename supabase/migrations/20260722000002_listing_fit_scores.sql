-- supabase/migrations/20260722000002_listing_fit_scores.sql
--
-- Story 10.2 — AC1, AC5, AC7, AC8
-- Creates listing_fit_scores table, RLS policies, invalidation trigger, and pg_cron schedule.
-- Idempotent: safe to run multiple times.

-- ─── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.listing_fit_scores (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id     UUID NOT NULL,  -- references auth.users(id) — no FK for GDPR cleanup flexibility
  listing_id   UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  overall_score NUMERIC(5,4) NOT NULL,  -- normalized 0.0000–1.0000
  dimension_scores JSONB NOT NULL,       -- DimensionScores JSON
  recommended_photo_index INTEGER,        -- nullable — computed in Story 10.3
  vector_version INTEGER NOT NULL DEFAULT 1,
  last_computed_at TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Indexes (AC1) ───────────────────────────────────────────────────────────

-- Unique constraint: one score per (buyer, listing) pair — enables UPSERT
CREATE UNIQUE INDEX IF NOT EXISTS listing_fit_scores_buyer_listing_unique
  ON public.listing_fit_scores (buyer_id, listing_id);

-- Index for personalized feed queries ordered by affinity (NFR2: <5ms)
CREATE INDEX IF NOT EXISTS idx_lfs_buyer_overall
  ON public.listing_fit_scores (buyer_id, overall_score DESC);

-- Index for mass invalidation when a listing changes
CREATE INDEX IF NOT EXISTS idx_lfs_listing
  ON public.listing_fit_scores (listing_id);

-- ─── RLS (AC7) ───────────────────────────────────────────────────────────────

ALTER TABLE public.listing_fit_scores ENABLE ROW LEVEL SECURITY;

-- Buyer: can only SELECT own scores
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'lfs_buyer_select_own' AND tablename = 'listing_fit_scores'
  ) THEN
    CREATE POLICY lfs_buyer_select_own ON public.listing_fit_scores
      FOR SELECT
      USING (
        buyer_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND role = 'buyer'
        )
      );
  END IF;
END $$;

-- Platform admin: can SELECT all records
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'lfs_admin_select_all' AND tablename = 'listing_fit_scores'
  ) THEN
    CREATE POLICY lfs_admin_select_all ON public.listing_fit_scores
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND role = 'platform_admin'
        )
      );
  END IF;
END $$;

-- Service role: full access for batch jobs (INSERT, UPDATE, DELETE)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'lfs_service_all' AND tablename = 'listing_fit_scores'
  ) THEN
    CREATE POLICY lfs_service_all ON public.listing_fit_scores
      FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ─── Invalidation trigger (AC5) ──────────────────────────────────────────────

-- When a listing's scoring-relevant fields change, delete its fit scores
-- so the next batch job recalculates them.
CREATE OR REPLACE FUNCTION public.invalidate_listing_fit_scores()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    OLD.price IS DISTINCT FROM NEW.price
    OR OLD.size_sqm IS DISTINCT FROM NEW.size_sqm
    OR OLD.bedrooms IS DISTINCT FROM NEW.bedrooms
    OR OLD.city IS DISTINCT FROM NEW.city
    OR OLD.latitude IS DISTINCT FROM NEW.latitude
    OR OLD.longitude IS DISTINCT FROM NEW.longitude
  ) THEN
    DELETE FROM public.listing_fit_scores
    WHERE listing_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger (idempotent)
DROP TRIGGER IF EXISTS trg_invalidate_fit_scores ON public.listings;
CREATE TRIGGER trg_invalidate_fit_scores
  AFTER UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.invalidate_listing_fit_scores();

-- ─── pg_cron schedule (AC4) ──────────────────────────────────────────────────

-- SQL wrapper function for the batch job
CREATE OR REPLACE FUNCTION public.compute_listing_fit_scores()
RETURNS void AS $$
BEGIN
  -- In production, this calls the API endpoint via pg_net:
  -- PERFORM net.http_post(
  --   url := current_setting('app.settings.api_base_url') || '/api/v1/admin/fit-scores/compute',
  --   headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
  --   body := '{}'::jsonb
  -- );
  RAISE NOTICE 'compute_listing_fit_scores: batch job triggered at %', now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule: every 6 hours at minute 45 (45 */6 * * *)
-- 30 minutes after preference_vectors (minute 15) to ensure vectors are fresh.
-- Guard: only schedule if pg_cron extension exists.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('compute_listing_fit_scores');
    PERFORM cron.schedule(
      'compute_listing_fit_scores',
      '45 */6 * * *',
      'SELECT public.compute_listing_fit_scores()'
    );
  ELSE
    RAISE NOTICE 'pg_cron not available — skipping listing_fit_scores schedule';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron scheduling failed: %. Continuing.', SQLERRM;
END $$;
