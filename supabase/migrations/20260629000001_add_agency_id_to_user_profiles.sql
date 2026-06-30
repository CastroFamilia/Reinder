-- Migration: Add agency_id to user_profiles
-- Story 5.4: links agency_admin / agent users to their agency for ownership guards
-- This column was added to the Drizzle schema but the migration was never generated.

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id);
