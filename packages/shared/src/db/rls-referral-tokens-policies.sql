-- packages/shared/src/db/rls-referral-tokens-policies.sql
--
-- Row Level Security policies for referral_tokens table.
-- Story 3.1 — Task 5
--
-- Prerequisites:
--   1. RLS must be enabled on the table (done in rls-policies.sql base)
--   2. The `app_role` enum and `user_profiles` table must exist
--   3. Execute with a service-role connection (bypasses RLS itself)
--
-- Apply in Supabase SQL editor or via migration:
--   psql $DATABASE_URL -f packages/shared/src/db/rls-referral-tokens-policies.sql

-- ─── Enable RLS ───────────────────────────────────────────────────────────────

ALTER TABLE referral_tokens ENABLE ROW LEVEL SECURITY;

-- ─── Helper: get role of the current user ────────────────────────────────────
-- We reuse the same pattern as rls-agent-policies.sql

-- ─── Policy: INSERT — only agents can insert their own tokens ─────────────────

DROP POLICY IF EXISTS "agents_can_insert_own_referral_tokens" ON referral_tokens;

CREATE POLICY "agents_can_insert_own_referral_tokens"
  ON referral_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    agent_id = auth.uid()
    AND (
      SELECT role FROM user_profiles WHERE id = auth.uid()
    ) = 'agent'
  );

-- ─── Policy: SELECT — agents see only their own tokens; buyers see none ───────

DROP POLICY IF EXISTS "agents_can_select_own_referral_tokens" ON referral_tokens;

CREATE POLICY "agents_can_select_own_referral_tokens"
  ON referral_tokens
  FOR SELECT
  TO authenticated
  USING (
    agent_id = auth.uid()
    AND (
      SELECT role FROM user_profiles WHERE id = auth.uid()
    ) = 'agent'
  );

-- ─── Policy: UPDATE (used flag) — only service role / Edge Functions ─────────
-- Buyers accepting a referral link call a server-side endpoint that uses
-- the service-role key — so no explicit authenticated UPDATE policy is needed.
-- This ensures `used` can only be flipped server-side.

DROP POLICY IF EXISTS "service_role_can_update_referral_tokens" ON referral_tokens;

-- (No explicit policy needed — service_role bypasses RLS automatically)
-- Document: never allow authenticated users to UPDATE referral_tokens directly.

-- ─── Policy: DELETE — no user can delete tokens (audit trail preserved) ──────

DROP POLICY IF EXISTS "no_delete_referral_tokens" ON referral_tokens;

CREATE POLICY "no_delete_referral_tokens"
  ON referral_tokens
  FOR DELETE
  TO authenticated
  USING (false); -- deny all authenticated deletes; service_role can still delete

-- ─── Verification query ───────────────────────────────────────────────────────
-- Run this to confirm policies are in place:
--
-- SELECT schemaname, tablename, policyname, cmd, roles
-- FROM pg_policies
-- WHERE tablename = 'referral_tokens';
