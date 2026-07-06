-- Story 9.4 — Experiment significance engine & auto-promotion
--
-- 1. Extend experiment_status enum with 'winner_promoted'
-- 2. Create experiment_promotion_logs table (AC6)
-- 3. Add sum_view_time_sq_ms to experiment_results (if not already present)
-- 4. RLS policies for experiment_promotion_logs
--
-- Source: story 9-4, AC6, AC10, Task 4

-- ─── 0. Extend experiment_status enum ──────────────────────────────────────
-- IMPORTANT: ALTER TYPE ... ADD VALUE cannot run inside a transaction in PostgreSQL.
-- This MUST be placed before any BEGIN ... COMMIT block.

ALTER TYPE experiment_status ADD VALUE IF NOT EXISTS 'winner_promoted';

-- ─── 1. Promotion logs table ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS experiment_promotion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES listing_experiments(id),
  listing_id UUID NOT NULL REFERENCES listings(id),
  promoted_variant TEXT NOT NULL CHECK (promoted_variant IN ('a', 'b')),
  experiment_type TEXT NOT NULL,
  previous_content JSONB NOT NULL,
  promoted_content JSONB NOT NULL,
  promoted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  promoted_by TEXT NOT NULL DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_promotion_logs_experiment_id
  ON experiment_promotion_logs(experiment_id);

CREATE INDEX IF NOT EXISTS idx_promotion_logs_listing_id
  ON experiment_promotion_logs(listing_id);

-- ─── 2. Add sum_view_time_sq_ms to experiment_results ──────────────────────
-- This column may already exist if Story 9.3 migration added it.
-- Using IF NOT EXISTS pattern via DO block for idempotency.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'experiment_results'
      AND column_name = 'sum_view_time_sq_ms'
  ) THEN
    ALTER TABLE experiment_results
      ADD COLUMN sum_view_time_sq_ms BIGINT NOT NULL DEFAULT 0;
  END IF;
END;
$$;

-- ─── 3. RLS for experiment_promotion_logs ──────────────────────────────────

ALTER TABLE experiment_promotion_logs ENABLE ROW LEVEL SECURITY;

-- agency_admin can read promotion logs for their own experiments
CREATE POLICY "agency_admin_can_read_own_promotion_logs"
  ON experiment_promotion_logs
  FOR SELECT
  TO authenticated
  USING (
    experiment_id IN (
      SELECT id FROM listing_experiments
      WHERE agency_id = (
        SELECT agency_id FROM user_profiles
        WHERE id = auth.uid() AND role = 'agency_admin'
      )
    )
  );

-- platform_admin has full access
CREATE POLICY "platform_admin_full_access_promotion_logs"
  ON experiment_promotion_logs
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'platform_admin'
  );

-- Only service_role can insert (system operations, not direct user access)
CREATE POLICY "service_role_can_insert_promotion_logs"
  ON experiment_promotion_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);
