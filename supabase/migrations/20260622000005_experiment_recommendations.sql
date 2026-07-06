-- =============================================================================
-- Story 9.5: Experiment Recommendations for Underperforming Listings
-- =============================================================================
-- Creates the experiment_recommendations table, RLS policies,
-- the generate_experiment_recommendations() function, and pg_cron job.
--
-- Idempotent: uses IF NOT EXISTS, CREATE OR REPLACE, DO $$ blocks.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Create experiment_recommendations table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS experiment_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id),
  listing_id UUID NOT NULL REFERENCES listings(id),
  recommended_experiment_type experiment_type NOT NULL,
  reason_code TEXT NOT NULL,
  reason_detail TEXT NOT NULL,
  underperforming_metrics JSONB NOT NULL,
  priority_score NUMERIC(5,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  accepted_experiment_id UUID REFERENCES listing_experiments(id),
  week_generated TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. Create indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_recommendations_agency_id
  ON experiment_recommendations (agency_id);

CREATE INDEX IF NOT EXISTS idx_recommendations_listing_status
  ON experiment_recommendations (listing_id, status);

-- ---------------------------------------------------------------------------
-- 3. Enable RLS
-- ---------------------------------------------------------------------------

ALTER TABLE experiment_recommendations ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 4. RLS Policies
-- ---------------------------------------------------------------------------

-- agency_admin reads own recommendations
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'agency_admin_can_read_own_recommendations'
  ) THEN
    CREATE POLICY "agency_admin_can_read_own_recommendations"
      ON experiment_recommendations
      FOR SELECT
      TO authenticated
      USING (
        agency_id = (
          SELECT agency_id
          FROM user_profiles
          WHERE id = auth.uid()
            AND role = 'agency_admin'
        )
      );
  END IF;
END $$;

-- agency_admin updates own recommendations (dismiss/accept)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'agency_admin_can_update_own_recommendations'
  ) THEN
    CREATE POLICY "agency_admin_can_update_own_recommendations"
      ON experiment_recommendations
      FOR UPDATE
      TO authenticated
      USING (
        agency_id = (
          SELECT agency_id
          FROM user_profiles
          WHERE id = auth.uid()
            AND role = 'agency_admin'
        )
      )
      WITH CHECK (
        agency_id = (
          SELECT agency_id
          FROM user_profiles
          WHERE id = auth.uid()
            AND role = 'agency_admin'
        )
      );
  END IF;
END $$;

-- service_role inserts (cron job)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'service_role_can_insert_recommendations'
  ) THEN
    CREATE POLICY "service_role_can_insert_recommendations"
      ON experiment_recommendations
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- service_role updates (expiration)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'service_role_can_update_recommendations'
  ) THEN
    CREATE POLICY "service_role_can_update_recommendations"
      ON experiment_recommendations
      FOR UPDATE
      TO service_role
      USING (true);
  END IF;
END $$;

-- platform_admin full access
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'platform_admin_full_access_recommendations'
  ) THEN
    CREATE POLICY "platform_admin_full_access_recommendations"
      ON experiment_recommendations
      FOR ALL
      TO authenticated
      USING (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'platform_admin'
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Detection & Recommendation Function
-- ---------------------------------------------------------------------------
-- Prerequisite: listing_analytics_hourly table from Story 8.7.
-- If it doesn't exist, the function exits silently with a NOTICE.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION generate_experiment_recommendations()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  current_week TEXT := to_char(NOW(), 'IYYY-"W"IW');
  expiry_threshold TIMESTAMPTZ := NOW() - INTERVAL '14 days';
  analytics_table_exists BOOLEAN;
BEGIN
  -- Check if listing_analytics_hourly exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'listing_analytics_hourly'
      AND table_schema = 'public'
  ) INTO analytics_table_exists;

  IF NOT analytics_table_exists THEN
    RAISE NOTICE '[experiment-recommendations] listing_analytics_hourly table not found — skipping generation';
    RETURN;
  END IF;

  -- 1. Expire old pending recommendations (AC5)
  UPDATE experiment_recommendations
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending' AND created_at < expiry_threshold;

  -- 2. Generate new recommendations
  WITH
  -- Metrics per listing (only active with ≥50 impressions)
  listing_metrics AS (
    SELECT
      l.id AS listing_id,
      l.agency_id,
      COALESCE(lah.impressions, 0) AS impressions,
      CASE WHEN COALESCE(lah.impressions, 0) > 0
        THEN lah.match_count::NUMERIC / lah.impressions
        ELSE 0 END AS match_rate,
      CASE WHEN COALESCE(lah.impressions, 0) > 0
        THEN lah.total_view_time_ms::NUMERIC / lah.impressions
        ELSE 0 END AS avg_view_time_ms,
      CASE WHEN COALESCE(lah.match_count, 0) > 0
        THEN lah.reaffirm_count::NUMERIC / lah.match_count
        ELSE NULL END AS reaffirm_rate
    FROM listings l
    LEFT JOIN listing_analytics_hourly lah ON lah.listing_id = l.id
    WHERE l.status = 'active'
      AND COALESCE(lah.impressions, 0) >= 50
      -- Exclude listings with active experiment (AC2)
      AND NOT EXISTS (
        SELECT 1 FROM listing_experiments le
        WHERE le.listing_id = l.id
          AND le.status IN ('draft', 'running', 'paused')
      )
      -- Exclude listings with pending recommendation (AC2)
      AND NOT EXISTS (
        SELECT 1 FROM experiment_recommendations er
        WHERE er.listing_id = l.id
          AND er.status = 'pending'
      )
  ),
  -- Agency-level averages and stddev (min 2 listings for stddev)
  agency_stats AS (
    SELECT
      agency_id,
      AVG(match_rate) AS avg_match_rate,
      STDDEV_SAMP(match_rate) AS std_match_rate,
      AVG(avg_view_time_ms) AS avg_view_time,
      STDDEV_SAMP(avg_view_time_ms) AS std_view_time,
      AVG(reaffirm_rate) FILTER (WHERE reaffirm_rate IS NOT NULL) AS avg_reaffirm,
      STDDEV_SAMP(reaffirm_rate) FILTER (WHERE reaffirm_rate IS NOT NULL) AS std_reaffirm,
      COUNT(*) AS listing_count
    FROM listing_metrics
    GROUP BY agency_id
  ),
  -- Platform-wide stats (fallback for agencies with 1 listing)
  platform_stats AS (
    SELECT
      AVG(match_rate) AS avg_match_rate,
      STDDEV_SAMP(match_rate) AS std_match_rate,
      AVG(avg_view_time_ms) AS avg_view_time,
      STDDEV_SAMP(avg_view_time_ms) AS std_view_time,
      AVG(reaffirm_rate) FILTER (WHERE reaffirm_rate IS NOT NULL) AS avg_reaffirm,
      STDDEV_SAMP(reaffirm_rate) FILTER (WHERE reaffirm_rate IS NOT NULL) AS std_reaffirm
    FROM listing_metrics
  ),
  -- Z-scores per listing
  scored AS (
    SELECT
      lm.listing_id,
      lm.agency_id,
      lm.impressions,
      lm.match_rate,
      lm.avg_view_time_ms,
      lm.reaffirm_rate,
      -- Z-scores (protect against stddev=0)
      CASE
        WHEN COALESCE(ast.std_match_rate, ps.std_match_rate, 0) > 0
        THEN (lm.match_rate - COALESCE(ast.avg_match_rate, ps.avg_match_rate))
             / COALESCE(ast.std_match_rate, ps.std_match_rate)
        ELSE 0
      END AS z_match_rate,
      CASE
        WHEN COALESCE(ast.std_view_time, ps.std_view_time, 0) > 0
        THEN (lm.avg_view_time_ms - COALESCE(ast.avg_view_time, ps.avg_view_time))
             / COALESCE(ast.std_view_time, ps.std_view_time)
        ELSE 0
      END AS z_view_time,
      CASE
        WHEN lm.reaffirm_rate IS NOT NULL
          AND COALESCE(ast.std_reaffirm, ps.std_reaffirm, 0) > 0
        THEN (lm.reaffirm_rate - COALESCE(ast.avg_reaffirm, ps.avg_reaffirm))
             / COALESCE(ast.std_reaffirm, ps.std_reaffirm)
        ELSE NULL  -- exclude if no reaffirms
      END AS z_reaffirm,
      COALESCE(ast.avg_match_rate, ps.avg_match_rate) AS comp_avg_match,
      COALESCE(ast.avg_view_time, ps.avg_view_time) AS comp_avg_view,
      COALESCE(ast.avg_reaffirm, ps.avg_reaffirm) AS comp_avg_reaffirm,
      ps.avg_match_rate AS plat_avg_match,
      ps.avg_view_time AS plat_avg_view,
      ps.avg_reaffirm AS plat_avg_reaffirm,
      CASE WHEN COALESCE(ast.listing_count, 0) >= 2 THEN FALSE ELSE TRUE END AS uses_platform_fallback
    FROM listing_metrics lm
    LEFT JOIN agency_stats ast ON ast.agency_id = lm.agency_id
    CROSS JOIN platform_stats ps
  ),
  -- Filter underperforming: z < -1.0 in 2+ metrics (or z < -0.5 with platform fallback)
  underperforming AS (
    SELECT
      s.*,
      (CASE WHEN z_match_rate < CASE WHEN uses_platform_fallback THEN -0.5 ELSE -1.0 END THEN 1 ELSE 0 END
       + CASE WHEN z_view_time < CASE WHEN uses_platform_fallback THEN -0.5 ELSE -1.0 END THEN 1 ELSE 0 END
       + CASE WHEN z_reaffirm IS NOT NULL
              AND z_reaffirm < CASE WHEN uses_platform_fallback THEN -0.5 ELSE -1.0 END THEN 1 ELSE 0 END
      ) AS underperforming_count,
      -- Worst metric (lowest z-score)
      LEAST(
        z_match_rate,
        z_view_time,
        COALESCE(z_reaffirm, 0)
      ) AS worst_z
    FROM scored s
  ),
  -- Only those meeting threshold
  candidates AS (
    SELECT *,
      -- Recommended experiment type (AC3)
      CASE
        WHEN z_view_time <= z_match_rate AND z_view_time <= COALESCE(z_reaffirm, 0)
          THEN 'cover_image'
        WHEN z_match_rate <= z_view_time AND z_match_rate <= COALESCE(z_reaffirm, 0)
          AND z_view_time >= -0.5
          THEN 'title'
        WHEN z_reaffirm IS NOT NULL
          AND z_reaffirm <= z_match_rate AND z_reaffirm <= z_view_time
          THEN 'description'
        ELSE 'title_and_description'
      END AS rec_type,
      -- Reason code
      CASE
        WHEN underperforming_count >= 2 THEN 'multiple_metrics_low'
        WHEN z_view_time = worst_z THEN 'low_avg_view_time'
        WHEN z_match_rate = worst_z THEN 'low_match_rate'
        ELSE 'low_reaffirm_rate'
      END AS rec_reason_code,
      -- Priority score: abs(worst_z) × normalized_impressions × (1 + count/3)
      LEAST(100, GREATEST(0,
        ABS(worst_z) * (impressions::NUMERIC / 500) * (1 + underperforming_count::NUMERIC / 3) * 20
      )) AS calc_priority,
      ROW_NUMBER() OVER (
        PARTITION BY agency_id
        ORDER BY ABS(worst_z) * (impressions::NUMERIC / 500) * (1 + underperforming_count::NUMERIC / 3) DESC
      ) AS rn
    FROM underperforming
    WHERE underperforming_count >= 2
  )
  -- Insert max 3 per agency (if none already for this week) (AC4)
  INSERT INTO experiment_recommendations (
    agency_id, listing_id, recommended_experiment_type,
    reason_code, reason_detail, underperforming_metrics,
    priority_score, status, week_generated
  )
  SELECT
    c.agency_id,
    c.listing_id,
    c.rec_type::experiment_type,
    c.rec_reason_code,
    -- Human-readable reason detail
    CASE c.rec_reason_code
      WHEN 'low_match_rate' THEN
        format('Match rate %.1f%% — %.1fσ por debajo del promedio (%.1f%%)',
          c.match_rate * 100, ABS(c.z_match_rate), c.comp_avg_match * 100)
      WHEN 'low_avg_view_time' THEN
        format('Tiempo medio %.0fms — %.1fσ por debajo del promedio (%.0fms)',
          c.avg_view_time_ms, ABS(c.z_view_time), c.comp_avg_view)
      WHEN 'low_reaffirm_rate' THEN
        format('Reafirmación %.1f%% — %.1fσ por debajo del promedio (%.1f%%)',
          COALESCE(c.reaffirm_rate, 0) * 100, ABS(COALESCE(c.z_reaffirm, 0)),
          COALESCE(c.comp_avg_reaffirm, 0) * 100)
      ELSE
        format('%s métricas por debajo del promedio — el listing necesita optimización de contenido',
          c.underperforming_count)
    END,
    -- Underperforming metrics JSONB
    jsonb_build_object(
      'match_rate', jsonb_build_object(
        'value', round(c.match_rate::NUMERIC, 4),
        'agency_avg', round(c.comp_avg_match::NUMERIC, 4),
        'platform_avg', round(c.plat_avg_match::NUMERIC, 4),
        'z_score', round(c.z_match_rate::NUMERIC, 2)
      ),
      'avg_view_time_ms', jsonb_build_object(
        'value', round(c.avg_view_time_ms::NUMERIC, 0),
        'agency_avg', round(c.comp_avg_view::NUMERIC, 0),
        'platform_avg', round(c.plat_avg_view::NUMERIC, 0),
        'z_score', round(c.z_view_time::NUMERIC, 2)
      ),
      'reaffirm_rate', CASE
        WHEN c.reaffirm_rate IS NOT NULL THEN jsonb_build_object(
          'value', round(c.reaffirm_rate::NUMERIC, 4),
          'agency_avg', round(COALESCE(c.comp_avg_reaffirm, 0)::NUMERIC, 4),
          'platform_avg', round(COALESCE(c.plat_avg_reaffirm, 0)::NUMERIC, 4),
          'z_score', round(COALESCE(c.z_reaffirm, 0)::NUMERIC, 2)
        )
        ELSE NULL
      END
    ),
    round(c.calc_priority::NUMERIC, 2),
    'pending',
    current_week
  FROM candidates c
  WHERE c.rn <= 3
    -- Idempotency: don't insert if already have recommendations for this week for this agency
    AND NOT EXISTS (
      SELECT 1 FROM experiment_recommendations er
      WHERE er.agency_id = c.agency_id
        AND er.week_generated = current_week
    );

  RAISE LOG '[experiment-recommendations] Generated recommendations for week %', current_week;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Register pg_cron job — weekly on Mondays at 06:00 UTC (AC9)
-- ---------------------------------------------------------------------------

-- Ensure pg_cron extension is available
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Unschedule existing job if present (for idempotent re-deployment)
DO $$ BEGIN
  PERFORM cron.unschedule('generate-experiment-recommendations');
EXCEPTION WHEN OTHERS THEN
  -- Job doesn't exist yet, that's fine
  NULL;
END $$;

-- Schedule weekly: Monday 06:00 UTC
SELECT cron.schedule(
  'generate-experiment-recommendations',
  '0 6 * * 1',
  'SELECT generate_experiment_recommendations()'
);
