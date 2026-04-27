-- packages/shared/src/db/rls-agent-buyer-bonds-policies.sql
--
-- Row Level Security policies for agent_buyer_bonds table.
-- Story 3.2 — Task 1
--
-- Bond creation is done server-side via service-role (Route Handler / Edge Function).
-- Neither agent nor buyer can INSERT/DELETE bonds directly.
--
-- Apply in Supabase SQL editor or via migration.

-- ─── Enable RLS ───────────────────────────────────────────────────────────────

ALTER TABLE agent_buyer_bonds ENABLE ROW LEVEL SECURITY;

-- ─── Policy: SELECT — agent sees their own bonds ──────────────────────────────

DROP POLICY IF EXISTS "agents_can_select_own_bonds" ON agent_buyer_bonds;

CREATE POLICY "agents_can_select_own_bonds"
  ON agent_buyer_bonds
  FOR SELECT
  TO authenticated
  USING (
    agent_id = auth.uid()
    AND (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'agent'
  );

-- ─── Policy: SELECT — buyer sees their own bond ───────────────────────────────

DROP POLICY IF EXISTS "buyers_can_select_own_bond" ON agent_buyer_bonds;

CREATE POLICY "buyers_can_select_own_bond"
  ON agent_buyer_bonds
  FOR SELECT
  TO authenticated
  USING (
    buyer_id = auth.uid()
    AND (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'buyer'
  );

-- ─── Policy: INSERT — denied for all authenticated users (service_role only) ──

DROP POLICY IF EXISTS "no_insert_agent_buyer_bonds" ON agent_buyer_bonds;

CREATE POLICY "no_insert_agent_buyer_bonds"
  ON agent_buyer_bonds
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- ─── Policy: UPDATE — only service_role (for status changes) ─────────────────
-- service_role bypasses RLS automatically. No explicit policy needed.
-- Buyers can request unlink in Story 3.3 — handled via server-side endpoint.

-- ─── Policy: DELETE — denied for all authenticated users ──────────────────────

DROP POLICY IF EXISTS "no_delete_agent_buyer_bonds" ON agent_buyer_bonds;

CREATE POLICY "no_delete_agent_buyer_bonds"
  ON agent_buyer_bonds
  FOR DELETE
  TO authenticated
  USING (false);

-- ─── Verification ─────────────────────────────────────────────────────────────
-- SELECT schemaname, tablename, policyname, cmd
-- FROM pg_policies
-- WHERE tablename = 'agent_buyer_bonds';
