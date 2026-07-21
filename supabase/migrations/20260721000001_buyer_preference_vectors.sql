-- =============================================================================
-- Story 10.1: buyer_preference_vectors — Generación y Persistencia
--
-- Creates:
--   1. buyer_preference_vectors table (AC1)
--   2. RLS policies (AC6)
--   3. SQL wrapper function for pg_cron (AC4)
--   4. pg_cron schedule: 15 */6 * * * (AC4)
--
-- Idempotent: executing twice does not error (AC7).
-- =============================================================================

-- ─── 1. Table Creation ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS buyer_preference_vectors (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id        UUID        NOT NULL,
  vector          JSONB       NOT NULL,
  swipe_count     INTEGER     NOT NULL DEFAULT 0,
  engagement_event_count INTEGER NOT NULL DEFAULT 0,
  version         INTEGER     NOT NULL DEFAULT 1,
  last_computed_at TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique index on buyer_id (1:1 relationship)
CREATE UNIQUE INDEX IF NOT EXISTS buyer_preference_vectors_buyer_id_unique
  ON buyer_preference_vectors (buyer_id);

-- Index for buyer_id lookups
CREATE INDEX IF NOT EXISTS idx_buyer_preference_vectors_buyer_id
  ON buyer_preference_vectors (buyer_id);

-- Index for freshness monitoring queries (AC1)
CREATE INDEX IF NOT EXISTS idx_bpv_last_computed
  ON buyer_preference_vectors (last_computed_at);

-- ─── 2. RLS Policies (AC6) ──────────────────────────────────────────────────

ALTER TABLE buyer_preference_vectors ENABLE ROW LEVEL SECURITY;

-- Policy: buyer can only SELECT their own vector
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'buyer_select_own_vector'
      AND tablename = 'buyer_preference_vectors'
  ) THEN
    EXECUTE '
      CREATE POLICY buyer_select_own_vector ON buyer_preference_vectors
        FOR SELECT
        USING (
          buyer_id = auth.uid()
          AND EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = ''buyer''
          )
        )
    ';
  END IF;
END $$;

-- Policy: platform_admin can SELECT all vectors (for debugging/monitoring)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'platform_admin_select_all_vectors'
      AND tablename = 'buyer_preference_vectors'
  ) THEN
    EXECUTE '
      CREATE POLICY platform_admin_select_all_vectors ON buyer_preference_vectors
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = ''platform_admin''
          )
        )
    ';
  END IF;
END $$;

-- No INSERT/UPDATE/DELETE policies for end users — only service_role can write

-- ─── 3. SQL Wrapper Function for pg_cron (AC4) ─────────────────────────────

-- The actual computation is done by the API endpoint (TypeScript).
-- This SQL function calls the API via pg_net (if available) or serves as
-- a placeholder for the pg_cron trigger.
CREATE OR REPLACE FUNCTION compute_buyer_preference_vectors()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- In production, this would call the admin API endpoint via pg_net:
  -- PERFORM net.http_post(
  --   url := current_setting('app.settings.api_url') || '/api/v1/admin/preference-vectors/compute',
  --   headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
  --   body := '{}'::jsonb
  -- );
  --
  -- For now, log execution. The actual batch computation is handled
  -- by the TypeScript computePreferenceVector() called from the API endpoint.
  RAISE LOG 'compute_buyer_preference_vectors() executed at %', now();
END;
$$;

-- ─── 4. pg_cron Schedule (AC4) ─────────────────────────────────────────────
-- Schedule: 15 */6 * * * (00:15, 06:15, 12:15, 18:15 UTC)
-- Offset to minute 15 to avoid collision with:
--   - Engagement aggregation (minute 0)
--   - Experiment results (minute 30)

DO $$
BEGIN
  -- Guard: only schedule if pg_cron extension is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove existing schedule if present (idempotent)
    PERFORM cron.unschedule('compute_buyer_preference_vectors')
    WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'compute_buyer_preference_vectors'
    );

    -- Schedule the job
    PERFORM cron.schedule(
      'compute_buyer_preference_vectors',
      '15 */6 * * *',
      $$SELECT compute_buyer_preference_vectors()$$
    );
  ELSE
    RAISE LOG 'pg_cron not available — skipping preference vector schedule';
  END IF;
END $$;
