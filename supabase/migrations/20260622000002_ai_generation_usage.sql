-- Story 9.6: AI generation usage tracking table
-- Tracks each AI variant generation call for rate limiting and billing audit.

CREATE TABLE IF NOT EXISTS ai_generation_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id),
  listing_id UUID NOT NULL REFERENCES listings(id),
  user_id UUID NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_generation_usage_agency_created
  ON ai_generation_usage (agency_id, created_at);

ALTER TABLE ai_generation_usage ENABLE ROW LEVEL SECURITY;

-- agency_admin can read their own agency's AI usage records
CREATE POLICY "agency_admin_can_read_own_ai_usage"
  ON ai_generation_usage
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

-- INSERT via service_role (from server-side API endpoint using Drizzle admin client)
CREATE POLICY "service_role_can_insert_ai_usage"
  ON ai_generation_usage
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- platform_admin full access for auditing
CREATE POLICY "platform_admin_full_access_ai_usage"
  ON ai_generation_usage
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );
