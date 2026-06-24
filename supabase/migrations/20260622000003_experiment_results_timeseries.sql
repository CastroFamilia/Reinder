-- =============================================================================
-- Story 9.3 — Migration: experiment_results_timeseries + sum_view_time_sq_ms
--
-- Adds:
-- 1. Column sum_view_time_sq_ms to experiment_results (for variance calculation)
-- 2. Table experiment_results_timeseries (hourly snapshots for time-series charts)
-- 3. RLS policies for agency_admin access
-- 4. SQL aggregation function aggregate_experiment_results()
-- 5. pg_cron schedule at minute 30 (avoids collision with Epic 8 at minute 0)
--
-- Source: story 9-3, AC2, AC3, AC4, AC11
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add sum_view_time_sq_ms to experiment_results
-- Story 9.4 needs this for Welch's t-test variance calculation:
--   variance = E[X²] - (E[X])²  =  sum_view_time_sq_ms/n - (total_view_time_ms/n)²
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'experiment_results'
      AND column_name = 'sum_view_time_sq_ms'
  ) THEN
    ALTER TABLE experiment_results
      ADD COLUMN sum_view_time_sq_ms BIGINT NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Create experiment_results_timeseries table
-- Stores hourly cumulative snapshots per variant for time-series charts.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS experiment_results_timeseries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES listing_experiments(id),
  variant TEXT NOT NULL,                    -- 'a' | 'b'
  bucket_hour TIMESTAMPTZ NOT NULL,         -- date_trunc('hour', now())
  impressions INTEGER NOT NULL DEFAULT 0,   -- cumulative
  total_view_time_ms BIGINT NOT NULL DEFAULT 0, -- cumulative
  match_count INTEGER NOT NULL DEFAULT 0,   -- cumulative
  reaffirm_count INTEGER NOT NULL DEFAULT 0,-- cumulative
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: one snapshot per variant per hour per experiment
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'experiment_results_timeseries_unique'
  ) THEN
    ALTER TABLE experiment_results_timeseries
      ADD CONSTRAINT experiment_results_timeseries_unique
      UNIQUE (experiment_id, variant, bucket_hour);
  END IF;
END $$;

-- Index for querying time-series by experiment
CREATE INDEX IF NOT EXISTS idx_experiment_results_timeseries_experiment
  ON experiment_results_timeseries (experiment_id);

-- ---------------------------------------------------------------------------
-- 3. RLS Policies
-- Agency admins can only see timeseries for their own experiments.
-- ---------------------------------------------------------------------------

ALTER TABLE experiment_results_timeseries ENABLE ROW LEVEL SECURITY;

-- Drop existing policy to make migration idempotent
DROP POLICY IF EXISTS "agency_admin_select_experiment_results_timeseries"
  ON experiment_results_timeseries;

CREATE POLICY "agency_admin_select_experiment_results_timeseries"
  ON experiment_results_timeseries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM listing_experiments le
      JOIN user_profiles up ON up.agency_id = le.agency_id
      WHERE le.id = experiment_results_timeseries.experiment_id
        AND up.id = auth.uid()
        AND up.role = 'agency_admin'
    )
  );

-- Also add RLS for experiment_results if not yet done
DROP POLICY IF EXISTS "agency_admin_select_experiment_results"
  ON experiment_results;

CREATE POLICY "agency_admin_select_experiment_results"
  ON experiment_results
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM listing_experiments le
      JOIN user_profiles up ON up.agency_id = le.agency_id
      WHERE le.id = experiment_results.experiment_id
        AND up.id = auth.uid()
        AND up.role = 'agency_admin'
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Aggregation function: aggregate_experiment_results()
-- Runs as SQL function called by pg_cron.
-- Processes ALL running experiments, calculates metrics per variant,
-- upserts into experiment_results and experiment_results_timeseries.
-- Error isolation per experiment via individual BEGIN/EXCEPTION blocks.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION aggregate_experiment_results()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  exp RECORD;
  processed_count INTEGER := 0;
  error_count INTEGER := 0;
  start_ts TIMESTAMPTZ := clock_timestamp();
  current_bucket TIMESTAMPTZ := date_trunc('hour', now());
BEGIN
  -- Iterate over all running experiments
  FOR exp IN
    SELECT id, listing_id, started_at
    FROM listing_experiments
    WHERE status = 'running'
  LOOP
    BEGIN
      -- Upsert experiment_results for each variant
      WITH variant_metrics AS (
        SELECT
          ea.variant,
          COUNT(DISTINCT ea.buyer_id) FILTER (
            WHERE EXISTS (
              SELECT 1 FROM listing_engagement_events lee
              WHERE lee.buyer_id = ea.buyer_id
                AND lee.listing_id = exp.listing_id
                AND lee.event_type = 'photo_view'
                AND lee.created_at >= exp.started_at
            )
          ) AS impressions,
          COALESCE(
            (SELECT SUM(lee2.view_time_ms)
             FROM listing_engagement_events lee2
             WHERE lee2.buyer_id = ANY(ARRAY_AGG(ea.buyer_id))
               AND lee2.listing_id = exp.listing_id
               AND lee2.event_type = 'photo_view'
               AND lee2.created_at >= exp.started_at
            ), 0
          ) AS total_view_time_ms,
          COALESCE(
            (SELECT SUM(lee3.view_time_ms::bigint * lee3.view_time_ms::bigint)
             FROM listing_engagement_events lee3
             WHERE lee3.buyer_id = ANY(ARRAY_AGG(ea.buyer_id))
               AND lee3.listing_id = exp.listing_id
               AND lee3.event_type = 'photo_view'
               AND lee3.created_at >= exp.started_at
            ), 0
          ) AS sum_view_time_sq_ms,
          COALESCE(
            (SELECT COUNT(DISTINCT se.id)
             FROM swipe_events se
             WHERE se.buyer_id = ANY(ARRAY_AGG(ea.buyer_id))
               AND se.listing_id = exp.listing_id
               AND se.action = 'match'
               AND se.created_at >= exp.started_at
            ), 0
          ) AS match_count,
          COALESCE(
            (SELECT COUNT(DISTINCT lee4.id)
             FROM listing_engagement_events lee4
             WHERE lee4.buyer_id = ANY(ARRAY_AGG(ea.buyer_id))
               AND lee4.listing_id = exp.listing_id
               AND lee4.event_type = 'match_reaffirm'
               AND lee4.created_at >= exp.started_at
            ), 0
          ) AS reaffirm_count
        FROM experiment_assignments ea
        WHERE ea.experiment_id = exp.id
        GROUP BY ea.variant
      )
      INSERT INTO experiment_results (
        id, experiment_id, variant, impressions, total_view_time_ms,
        sum_view_time_sq_ms, match_count, reaffirm_count, updated_at
      )
      SELECT
        gen_random_uuid(), exp.id, vm.variant, vm.impressions,
        vm.total_view_time_ms, vm.sum_view_time_sq_ms,
        vm.match_count, vm.reaffirm_count, now()
      FROM variant_metrics vm
      ON CONFLICT (experiment_id, variant)
      DO UPDATE SET
        impressions = EXCLUDED.impressions,
        total_view_time_ms = EXCLUDED.total_view_time_ms,
        sum_view_time_sq_ms = EXCLUDED.sum_view_time_sq_ms,
        match_count = EXCLUDED.match_count,
        reaffirm_count = EXCLUDED.reaffirm_count,
        updated_at = now();

      -- Upsert time-series snapshot
      INSERT INTO experiment_results_timeseries (
        experiment_id, variant, bucket_hour,
        impressions, total_view_time_ms, match_count, reaffirm_count
      )
      SELECT
        exp.id, er.variant, current_bucket,
        er.impressions, er.total_view_time_ms::bigint,
        er.match_count, er.reaffirm_count
      FROM experiment_results er
      WHERE er.experiment_id = exp.id
      ON CONFLICT (experiment_id, variant, bucket_hour)
      DO UPDATE SET
        impressions = EXCLUDED.impressions,
        total_view_time_ms = EXCLUDED.total_view_time_ms,
        match_count = EXCLUDED.match_count,
        reaffirm_count = EXCLUDED.reaffirm_count;

      processed_count := processed_count + 1;

    EXCEPTION WHEN OTHERS THEN
      -- Error isolation: log and continue with next experiment
      RAISE WARNING 'aggregate_experiment_results: error processing experiment %: %',
        exp.id, SQLERRM;
      error_count := error_count + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'processed', processed_count,
    'errors', error_count,
    'duration_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - start_ts)::integer
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. pg_cron schedule — every hour at minute 30
-- Avoids collision with Epic 8 aggregation that runs at minute 0.
-- NOTE: pg_cron must be enabled in Supabase dashboard first.
-- ---------------------------------------------------------------------------

-- Wrap in DO block to handle case where pg_cron is not installed
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove existing schedule if any (idempotent)
    PERFORM cron.unschedule('aggregate-experiment-results');
    -- Schedule at minute 30 of every hour
    PERFORM cron.schedule(
      'aggregate-experiment-results',
      '30 * * * *',
      'SELECT aggregate_experiment_results()'
    );
  ELSE
    RAISE NOTICE 'pg_cron not installed — skipping schedule creation. Enable it in Supabase dashboard.';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron scheduling failed: %. Enable pg_cron in Supabase dashboard.', SQLERRM;
END $$;
