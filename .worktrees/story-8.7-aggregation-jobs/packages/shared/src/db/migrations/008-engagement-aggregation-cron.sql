-- =============================================================================
-- Migration: 008-engagement-aggregation-cron.sql
-- Story 8.7 — Aggregation Jobs para Read Models de Analytics
--
-- IMPORTANT: pg_cron must be enabled in Supabase Dashboard BEFORE running this:
--   Dashboard → Database → Extensions → pg_cron → Enable
--
-- This migration creates:
-- 1. RLS policies for engagement tables (listing_engagement_events, listing_analytics_hourly, buyer_intent_scores)
-- 2. SQL function for hourly aggregation (wrapping the logic from aggregation.ts)
-- 3. pg_cron schedule for hourly execution
--
-- Source: epics.md#Story 8.7
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. RLS Policies — Engagement Events
-- ---------------------------------------------------------------------------

ALTER TABLE listing_engagement_events ENABLE ROW LEVEL SECURITY;

-- Buyer: INSERT only (their own events)
CREATE POLICY "buyer_insert_own_events"
  ON listing_engagement_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    buyer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'buyer'
    )
  );

-- Platform Admin: SELECT all (for aggregation job and debugging)
CREATE POLICY "admin_select_all_events"
  ON listing_engagement_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

-- ---------------------------------------------------------------------------
-- 2. RLS Policies — Listing Analytics Hourly (read model)
-- ---------------------------------------------------------------------------

ALTER TABLE listing_analytics_hourly ENABLE ROW LEVEL SECURITY;

-- Agency Admin: can read analytics for their listings
CREATE POLICY "agency_admin_select_own_analytics"
  ON listing_analytics_hourly
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN listings l ON l.agency_id = (
        SELECT agency_id FROM listings WHERE id = listing_analytics_hourly.listing_id LIMIT 1
      )
      WHERE up.id = auth.uid() AND up.role = 'agency_admin'
    )
  );

-- Platform Admin: full access for debugging
CREATE POLICY "admin_full_analytics"
  ON listing_analytics_hourly
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

-- ---------------------------------------------------------------------------
-- 3. RLS Policies — Buyer Intent Scores (read model)
-- ---------------------------------------------------------------------------

ALTER TABLE buyer_intent_scores ENABLE ROW LEVEL SECURITY;

-- Agent: can read scores for their bonded buyers
CREATE POLICY "agent_select_bonded_buyer_scores"
  ON buyer_intent_scores
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agent_buyer_bonds abb
      WHERE abb.agent_id = auth.uid()
        AND abb.buyer_id = buyer_intent_scores.buyer_id
        AND abb.status = 'active'
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'agent'
    )
  );

-- Platform Admin: full access
CREATE POLICY "admin_full_intent_scores"
  ON buyer_intent_scores
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Aggregation Function — Listing Analytics Hourly
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION aggregate_listing_analytics_hourly()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bucket_start timestamptz;
  v_bucket_end timestamptz;
BEGIN
  -- Process last 2 hours (overlap to catch late events)
  v_bucket_end := date_trunc('hour', now());
  v_bucket_start := v_bucket_end - interval '2 hours';

  -- Upsert aggregated analytics
  INSERT INTO listing_analytics_hourly (
    listing_id, bucket_hour,
    total_views, avg_photo_view_ms, avg_scroll_depth_pct,
    match_count, reject_count, reaffirm_count,
    photo_engagement, updated_at
  )
  SELECT
    e.listing_id,
    date_trunc('hour', e.created_at) AS bucket_hour,
    -- total views = count of detail_open events
    COUNT(*) FILTER (WHERE e.event_type = 'detail_open') AS total_views,
    -- avg photo view time
    COALESCE(
      AVG((e.payload->>'duration_ms')::int) FILTER (WHERE e.event_type = 'photo_view'),
      0
    )::int AS avg_photo_view_ms,
    -- avg scroll depth
    COALESCE(
      AVG((e.payload->>'max_depth_pct')::int) FILTER (WHERE e.event_type = 'scroll_depth'),
      0
    )::int AS avg_scroll_depth_pct,
    -- counts
    0 AS match_count,  -- matches come from swipe_events, not engagement
    0 AS reject_count,
    COUNT(*) FILTER (WHERE e.event_type = 'match_reaffirm') AS reaffirm_count,
    -- photo engagement (JSONB aggregation)
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'photo_index', sub.photo_index,
            'avg_duration_ms', sub.avg_dur,
            'view_count', sub.view_count
          )
        )
        FROM (
          SELECT
            (pe.payload->>'photo_index')::int AS photo_index,
            AVG((pe.payload->>'duration_ms')::int)::int AS avg_dur,
            COUNT(*) AS view_count
          FROM listing_engagement_events pe
          WHERE pe.listing_id = e.listing_id
            AND pe.event_type = 'photo_view'
            AND pe.created_at >= v_bucket_start
            AND pe.created_at < v_bucket_end
            AND date_trunc('hour', pe.created_at) = date_trunc('hour', e.created_at)
          GROUP BY (pe.payload->>'photo_index')::int
        ) sub
      ),
      '[]'::jsonb
    ) AS photo_engagement,
    now() AS updated_at
  FROM listing_engagement_events e
  WHERE e.created_at >= v_bucket_start
    AND e.created_at < v_bucket_end
  GROUP BY e.listing_id, date_trunc('hour', e.created_at)
  ON CONFLICT (listing_id, bucket_hour)
  DO UPDATE SET
    total_views = EXCLUDED.total_views,
    avg_photo_view_ms = EXCLUDED.avg_photo_view_ms,
    avg_scroll_depth_pct = EXCLUDED.avg_scroll_depth_pct,
    match_count = EXCLUDED.match_count,
    reject_count = EXCLUDED.reject_count,
    reaffirm_count = EXCLUDED.reaffirm_count,
    photo_engagement = EXCLUDED.photo_engagement,
    updated_at = now();

  RAISE NOTICE '[aggregation] listing_analytics_hourly updated for % to %', v_bucket_start, v_bucket_end;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Aggregation Function — Buyer Intent Scores
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION calculate_buyer_intent_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_global_avg_view_ms numeric;
  v_max_match_cap int := 5;
BEGIN
  -- Compute global average photo view time
  SELECT COALESCE(AVG((payload->>'duration_ms')::numeric), 2000)
  INTO v_global_avg_view_ms
  FROM listing_engagement_events
  WHERE event_type = 'photo_view';

  -- Upsert intent scores per buyer
  INSERT INTO buyer_intent_scores (
    buyer_id, score, score_breakdown, last_calculated_at, updated_at
  )
  SELECT
    buyer_id,
    -- Score formula: match(15) + reaffirm_ratio(25) + view_time(30) + consistency(30)
    LEAST(100, GREATEST(0,
      (LEAST(match_count, v_max_match_cap) * 15) +
      (CASE WHEN detail_opens > 0
        THEN ROUND((reaffirm_count::numeric / detail_opens) * 25)
        ELSE 0 END) +
      (CASE WHEN v_global_avg_view_ms > 0
        THEN ROUND(LEAST(avg_view_ms / v_global_avg_view_ms, 2.0) / 2.0 * 30)
        ELSE 0 END) +
      (ROUND(
        (LEAST(unique_listings::numeric / 5, 1) + LEAST(unique_sessions::numeric / 3, 1)) / 2 * 30
      ))
    ))::int AS score,
    jsonb_build_object(
      'matchCount', match_count,
      'reaffirmRatio', CASE WHEN detail_opens > 0
        THEN ROUND((reaffirm_count::numeric / detail_opens)::numeric, 2)
        ELSE 0 END,
      'avgViewTimeVsGlobal', CASE WHEN v_global_avg_view_ms > 0
        THEN ROUND((avg_view_ms / v_global_avg_view_ms)::numeric, 2)
        ELSE 0 END,
      'preferenceConsistency', ROUND(
        ((LEAST(unique_listings::numeric / 5, 1) + LEAST(unique_sessions::numeric / 3, 1)) / 2)::numeric, 2
      )
    ) AS score_breakdown,
    now() AS last_calculated_at,
    now() AS updated_at
  FROM (
    SELECT
      buyer_id,
      COUNT(*) FILTER (WHERE event_type = 'match_reaffirm') AS match_count,
      COUNT(*) FILTER (WHERE event_type = 'match_reaffirm') AS reaffirm_count,
      COUNT(*) FILTER (WHERE event_type = 'detail_open') AS detail_opens,
      COALESCE(
        AVG((payload->>'duration_ms')::numeric) FILTER (WHERE event_type = 'photo_view'),
        0
      ) AS avg_view_ms,
      COUNT(DISTINCT listing_id) AS unique_listings,
      COUNT(DISTINCT session_id) AS unique_sessions
    FROM listing_engagement_events
    GROUP BY buyer_id
  ) buyer_stats
  ON CONFLICT (buyer_id)
  DO UPDATE SET
    score = EXCLUDED.score,
    score_breakdown = EXCLUDED.score_breakdown,
    last_calculated_at = now(),
    updated_at = now();

  RAISE NOTICE '[aggregation] buyer_intent_scores updated (global avg view: %ms)', v_global_avg_view_ms;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Master Aggregation Function (called by pg_cron)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION run_engagement_aggregation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM aggregate_listing_analytics_hourly();
  PERFORM calculate_buyer_intent_scores();
  RAISE NOTICE '[aggregation] Full aggregation complete at %', now();
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't propagate — read models keep last good values
  RAISE WARNING '[aggregation] Job failed: % — read models unchanged', SQLERRM;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. pg_cron Schedule
-- ---------------------------------------------------------------------------
-- NOTE: pg_cron must be enabled in Supabase Dashboard first!
-- Uncomment the line below after enabling pg_cron:

-- SELECT cron.schedule('engagement-aggregation', '0 * * * *', 'SELECT run_engagement_aggregation()');

-- To verify the job:
-- SELECT * FROM cron.job;

-- To manually run:
-- SELECT run_engagement_aggregation();
