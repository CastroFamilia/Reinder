-- Migration: Exclusivity Validation
-- Story 5.3: Validación de Exclusividad y Detección de Duplicados
-- Created: 2026-06-19
--
-- BUG FIX from worktree: notify_admin_exclusivity_conflict() now uses
-- pg_notify('admin_alerts', ...) instead of inserting fake "failed" rows
-- into crm_sync_queue. The worktree approach polluted the sync queue with
-- non-sync items that could be accidentally reprocessed.

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 1: Performance index on listings.catastral_ref
-- Required for fast duplicate lookups in validate_listing_exclusivity()
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_listings_catastral_ref
  ON listings USING btree (catastral_ref)
  WHERE catastral_ref IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTION: notify_admin_exclusivity_conflict(...)
-- Called when exclusivity conflict is detected.
-- BUG FIX: Uses pg_notify instead of inserting into crm_sync_queue.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION notify_admin_exclusivity_conflict(
  p_agency_id UUID,
  p_listing_id UUID,
  p_catastral_ref TEXT,
  p_conflicting_agency_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Send admin alert via pg_notify on the admin_alerts channel
  -- The admin dashboard or a background listener picks these up
  PERFORM pg_notify(
    'admin_alerts',
    json_build_object(
      'type', 'exclusivity_conflict',
      'agency_id', p_agency_id,
      'listing_id', p_listing_id,
      'catastral_ref', p_catastral_ref,
      'conflicting_agency_id', p_conflicting_agency_id,
      'message', 'Listing en pending_review por conflicto de exclusividad catastral',
      'timestamp', NOW()
    )::text
  );

  RAISE LOG '[exclusivity] Admin notified via pg_notify: agency % listing % conflicts on catastral_ref % with agency %',
    p_agency_id, p_listing_id, p_catastral_ref, p_conflicting_agency_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTION: validate_listing_exclusivity(p_listing_id, p_agency_id, p_catastral_ref)
-- Called by process_crm_sync_queue() after a successful upsert.
-- Checks if catastral_ref is already claimed by another active agency.
-- Updates listing status to 'active' (verified) or 'pending_review' (conflict).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION validate_listing_exclusivity(
  p_listing_id UUID,
  p_agency_id UUID,
  p_catastral_ref TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conflicting_agency_id UUID;
BEGIN
  -- If no catastral_ref provided → mark as active (best-effort, unverified)
  IF p_catastral_ref IS NULL OR TRIM(p_catastral_ref) = '' THEN
    UPDATE listings
    SET
      status = 'active',
      exclusivity_verified = false,
      updated_at = NOW()
    WHERE id = p_listing_id;

    RAISE LOG '[exclusivity] Listing % has no catastral_ref — set active (unverified)', p_listing_id;
    RETURN;
  END IF;

  -- Check for duplicate: same catastral_ref, different agency, status = 'active'
  SELECT agency_id INTO conflicting_agency_id
  FROM listings
  WHERE
    catastral_ref = p_catastral_ref
    AND agency_id != p_agency_id
    AND status = 'active'
    AND id != p_listing_id  -- exclude self
  LIMIT 1;

  IF conflicting_agency_id IS NOT NULL THEN
    -- Duplicate found → set to pending_review (FR24)
    UPDATE listings
    SET
      status = 'pending_review',
      exclusivity_verified = false,
      updated_at = NOW()
    WHERE id = p_listing_id;

    -- Notify admin of exclusivity conflict via pg_notify
    PERFORM notify_admin_exclusivity_conflict(
      p_agency_id,
      p_listing_id,
      p_catastral_ref,
      conflicting_agency_id
    );

    RAISE LOG '[exclusivity] Listing % (catastral_ref: %) conflicts with agency % — set pending_review',
      p_listing_id, p_catastral_ref, conflicting_agency_id;

  ELSE
    -- No duplicate → set to active with verified exclusivity (FR24)
    UPDATE listings
    SET
      status = 'active',
      exclusivity_verified = true,
      updated_at = NOW()
    WHERE id = p_listing_id;

    RAISE LOG '[exclusivity] Listing % (catastral_ref: %) verified unique — set active', p_listing_id, p_catastral_ref;
  END IF;

EXCEPTION WHEN OTHERS THEN
  -- Best-effort: if validation fails (e.g., DB error), set active with unverified flag
  UPDATE listings
  SET
    status = 'active',
    exclusivity_verified = false,
    updated_at = NOW()
  WHERE id = p_listing_id;

  RAISE WARNING '[exclusivity] Validation failed for listing % (catastral_ref: %): % — set active (best-effort)',
    p_listing_id, p_catastral_ref, SQLERRM;
END;
$$;
