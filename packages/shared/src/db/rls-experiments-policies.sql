-- ==========================================================================
-- RLS Policies for Experiment Tables
-- Reference file — actual policies are applied in:
--   supabase/migrations/20260622000001_experiments_schema.sql
--
-- Story 9.1, AC7, AC10
-- ==========================================================================

-- ─── listing_experiments ──────────────────────────────────────────────────────
-- agency_admin: SELECT, INSERT, UPDATE where agency_id matches
-- platform_admin: full access

-- ─── experiment_assignments ───────────────────────────────────────────────────
-- CRITICAL: NO POLICY for agency_admin → deny-by-default (NFR8)
-- buyer: SELECT/INSERT own assignments only (buyer_id = auth.uid())
-- platform_admin: full access
-- service_role: bypasses RLS for bulk ops

-- ─── experiment_results ───────────────────────────────────────────────────────
-- agency_admin: SELECT where experiment belongs to their agency (via subquery)
-- platform_admin: full access

-- See supabase/migrations/20260622000001_experiments_schema.sql for implementation.
