-- Story 10.5: Add personalization_enabled to user_profiles
-- GDPR: Allows buyers to opt-out of personalized content
-- Idempotent: uses IF NOT EXISTS guard

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'personalization_enabled'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN personalization_enabled BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;
END $$;
