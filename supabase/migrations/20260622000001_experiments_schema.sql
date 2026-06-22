-- ==========================================================================
-- Story 9.1 — Schema de Experimentos y Motor de Asignación de Variantes
-- Migration: 20260622000001_experiments_schema.sql
--
-- Creates:
--   - experiment_status enum
--   - experiment_type enum
--   - listing_experiments table (AC1)
--   - experiment_assignments table (AC2)
--   - experiment_results table (AC3)
--   - All indexes, unique constraints, and RLS policies (AC7, AC9)
--
-- Idempotent: uses IF NOT EXISTS / DO $$ BEGIN ... END $$ blocks.
-- ==========================================================================

-- ─── 1. Enums ─────────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'experiment_status') THEN
    CREATE TYPE experiment_status AS ENUM (
      'draft', 'running', 'paused', 'completed', 'cancelled'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'experiment_type') THEN
    CREATE TYPE experiment_type AS ENUM (
      'cover_image', 'title', 'description', 'title_and_description'
    );
  END IF;
END $$;

-- ─── 2. Table: listing_experiments (AC1) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS listing_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id),
  agency_id UUID NOT NULL REFERENCES agencies(id),
  name TEXT NOT NULL,
  status experiment_status NOT NULL DEFAULT 'draft',
  experiment_type experiment_type NOT NULL,
  variant_a JSONB NOT NULL,
  variant_b JSONB NOT NULL,
  min_sample_size INTEGER NOT NULL DEFAULT 100,
  target_p_value NUMERIC(4,3) NOT NULL DEFAULT 0.050,
  winner_variant TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_listing_experiments_listing_id
  ON listing_experiments (listing_id);

CREATE INDEX IF NOT EXISTS idx_listing_experiments_agency_id
  ON listing_experiments (agency_id);

-- Partial unique constraint: max 1 active experiment per listing (AC1)
-- Active = draft, running, or paused
CREATE UNIQUE INDEX IF NOT EXISTS listing_experiments_active_unique
  ON listing_experiments (listing_id)
  WHERE status IN ('draft', 'running', 'paused');

-- ─── 3. Table: experiment_assignments (AC2) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS experiment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES listing_experiments(id),
  buyer_id UUID NOT NULL,
  variant TEXT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique: one assignment per buyer per experiment
CREATE UNIQUE INDEX IF NOT EXISTS experiment_assignments_unique
  ON experiment_assignments (experiment_id, buyer_id);

-- Fast lookup from feed: buyer + experiment
CREATE INDEX IF NOT EXISTS idx_experiment_assignments_buyer_variant
  ON experiment_assignments (buyer_id, experiment_id);

-- ─── 4. Table: experiment_results (AC3) ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS experiment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES listing_experiments(id),
  variant TEXT NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  total_view_time_ms BIGINT NOT NULL DEFAULT 0,
  match_count INTEGER NOT NULL DEFAULT 0,
  reaffirm_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique: exactly 2 rows per experiment (a + b)
CREATE UNIQUE INDEX IF NOT EXISTS experiment_results_unique
  ON experiment_results (experiment_id, variant);

-- ─── 5. Enable RLS on all 3 tables (AC9) ─────────────────────────────────────

ALTER TABLE listing_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_results ENABLE ROW LEVEL SECURITY;

-- ─── 6. RLS Policies (AC7, AC10) ─────────────────────────────────────────────

-- listing_experiments: agency_admin can SELECT own experiments
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'agency_admin_can_read_own_experiments'
  ) THEN
    CREATE POLICY agency_admin_can_read_own_experiments
      ON listing_experiments
      FOR SELECT
      TO authenticated
      USING (
        agency_id = (
          SELECT agency_id FROM user_profiles
          WHERE id = auth.uid() AND role = 'agency_admin'
        )
      );
  END IF;
END $$;

-- listing_experiments: agency_admin can INSERT own experiments
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'agency_admin_can_create_experiments'
  ) THEN
    CREATE POLICY agency_admin_can_create_experiments
      ON listing_experiments
      FOR INSERT
      TO authenticated
      WITH CHECK (
        agency_id = (
          SELECT agency_id FROM user_profiles
          WHERE id = auth.uid() AND role = 'agency_admin'
        )
      );
  END IF;
END $$;

-- listing_experiments: agency_admin can UPDATE own experiments
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'agency_admin_can_update_own_experiments'
  ) THEN
    CREATE POLICY agency_admin_can_update_own_experiments
      ON listing_experiments
      FOR UPDATE
      TO authenticated
      USING (
        agency_id = (
          SELECT agency_id FROM user_profiles
          WHERE id = auth.uid() AND role = 'agency_admin'
        )
      )
      WITH CHECK (
        agency_id = (
          SELECT agency_id FROM user_profiles
          WHERE id = auth.uid() AND role = 'agency_admin'
        )
      );
  END IF;
END $$;

-- experiment_assignments: CRITICAL — NO POLICY for agency_admin (deny-by-default = NFR8)
-- Only buyers can read their own assignment

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'buyer_can_read_own_assignment'
  ) THEN
    CREATE POLICY buyer_can_read_own_assignment
      ON experiment_assignments
      FOR SELECT
      TO authenticated
      USING (
        buyer_id = auth.uid()
        AND (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'buyer'
      );
  END IF;
END $$;

-- experiment_assignments: buyer can insert own assignment
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'buyer_can_create_own_assignment'
  ) THEN
    CREATE POLICY buyer_can_create_own_assignment
      ON experiment_assignments
      FOR INSERT
      TO authenticated
      WITH CHECK (
        buyer_id = auth.uid()
        AND (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'buyer'
      );
  END IF;
END $$;

-- experiment_results: agency_admin can read aggregated metrics for their experiments
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'agency_admin_can_read_experiment_results'
  ) THEN
    CREATE POLICY agency_admin_can_read_experiment_results
      ON experiment_results
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
  END IF;
END $$;

-- platform_admin: full access to all 3 tables
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'platform_admin_full_access_experiments'
  ) THEN
    CREATE POLICY platform_admin_full_access_experiments
      ON listing_experiments
      FOR ALL
      TO authenticated
      USING (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'platform_admin'
      )
      WITH CHECK (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'platform_admin'
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'platform_admin_full_access_assignments'
  ) THEN
    CREATE POLICY platform_admin_full_access_assignments
      ON experiment_assignments
      FOR ALL
      TO authenticated
      USING (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'platform_admin'
      )
      WITH CHECK (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'platform_admin'
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'platform_admin_full_access_results'
  ) THEN
    CREATE POLICY platform_admin_full_access_results
      ON experiment_results
      FOR ALL
      TO authenticated
      USING (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'platform_admin'
      )
      WITH CHECK (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'platform_admin'
      );
  END IF;
END $$;
