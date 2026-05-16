-- Migration: Exclusivity Validation in CRM Queue Worker
-- Story 5.3: Validación de Exclusividad y Detección de Duplicados
-- Created: 2026-05-16

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTION: validate_listing_exclusivity(p_listing_id, p_agency_id, p_catastral_ref)
-- Called by process_crm_sync_queue() after a successful upsert.
-- Checks if catastral_ref is already claimed by another active agency.
-- Returns: 'active' | 'pending_review' based on validation result.
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

    -- Notify admin of exclusivity conflict
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

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTION: notify_admin_exclusivity_conflict(agency_id, listing_id, catastral_ref, conflicting_agency_id)
-- Called when exclusivity conflict is detected.
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
  -- Insert admin alert into the queue for dashboard surfacing
  INSERT INTO crm_sync_queue (
    agency_id,
    payload,
    status,
    retry_count,
    error_log
  ) VALUES (
    p_agency_id,
    jsonb_build_object(
      'type', 'admin_alert',
      'alert_type', 'exclusivity_conflict',
      'listing_id', p_listing_id::TEXT,
      'catastral_ref', p_catastral_ref,
      'conflicting_agency_id', p_conflicting_agency_id::TEXT,
      'message', 'Listing en pending_review por conflicto de exclusividad catastral',
      'timestamp', NOW()::TEXT
    ),
    'failed',  -- failed so it surfaces as an admin alert (not reprocessed)
    99,
    'Admin alert: exclusivity conflict for catastral_ref ' || p_catastral_ref
  );

  RAISE LOG '[exclusivity] Admin notified: agency % listing % conflicts on catastral_ref %',
    p_agency_id, p_listing_id, p_catastral_ref;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- PATCH: Update process_crm_sync_queue() to call validate_listing_exclusivity()
-- The function created in Story 5.2 needs to be updated to call exclusivity
-- validation after a successful upsert. We patch it here.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION process_crm_sync_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  queue_item RECORD;
  listing_payload JSONB;
  agency_uuid UUID;
  upsert_error TEXT;
  upserted_listing_id UUID;
  listing_catastral_ref TEXT;
BEGIN
  -- Process up to 50 pending items per run (batch size)
  FOR queue_item IN
    SELECT id, agency_id, payload, retry_count, error_log
    FROM crm_sync_queue
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT 50
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Mark as processing
    UPDATE crm_sync_queue
    SET status = 'processing', updated_at = NOW()
    WHERE id = queue_item.id;

    listing_payload := queue_item.payload;
    agency_uuid := queue_item.agency_id;
    upsert_error := NULL;
    upserted_listing_id := NULL;

    -- Skip resync-type payloads (batch resync action)
    IF listing_payload->>'action' = 'resync' THEN
      UPDATE crm_sync_queue SET status = 'completed', updated_at = NOW() WHERE id = queue_item.id;
      CONTINUE;
    END IF;

    BEGIN
      -- Upsert listing and capture the upserted ID
      INSERT INTO listings (
        agency_id,
        external_id,
        title,
        description,
        price,
        bedrooms,
        size_sqm,
        address,
        city,
        images,
        catastral_ref,
        status,
        exclusivity_verified,
        updated_at
      )
      VALUES (
        agency_uuid,
        COALESCE(listing_payload->>'ref', listing_payload->>'id'),
        COALESCE(listing_payload->>'titulo', listing_payload->>'title', ''),
        COALESCE(listing_payload->>'descripcion', listing_payload->>'description'),
        NULLIF(COALESCE(listing_payload->>'precio', listing_payload->>'price'), '')::NUMERIC,
        NULLIF(COALESCE(listing_payload->>'habitaciones', listing_payload->>'bedrooms'), '')::INTEGER,
        NULLIF(COALESCE(listing_payload->>'superficie', listing_payload->>'size'), '')::NUMERIC,
        COALESCE(listing_payload->>'direccion', listing_payload->>'address'),
        COALESCE(listing_payload->>'municipio', listing_payload->>'city'),
        COALESCE(listing_payload->'fotos', listing_payload->'images', '[]'::JSONB),
        listing_payload->>'referencia_catastral',
        'active',  -- Temporary status — exclusivity validation may change this
        false,
        NOW()
      )
      ON CONFLICT (agency_id, external_id)
      DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        bedrooms = EXCLUDED.bedrooms,
        size_sqm = EXCLUDED.size_sqm,
        address = EXCLUDED.address,
        city = EXCLUDED.city,
        images = EXCLUDED.images,
        catastral_ref = EXCLUDED.catastral_ref,
        updated_at = NOW()
      RETURNING id, catastral_ref INTO upserted_listing_id, listing_catastral_ref;

      -- Story 5.3: Validate exclusivity after upsert
      PERFORM validate_listing_exclusivity(upserted_listing_id, agency_uuid, listing_catastral_ref);

      -- Mark queue item as completed
      UPDATE crm_sync_queue
      SET status = 'completed', updated_at = NOW()
      WHERE id = queue_item.id;

    EXCEPTION WHEN OTHERS THEN
      upsert_error := SQLERRM;

      IF queue_item.retry_count >= 2 THEN
        UPDATE crm_sync_queue
        SET
          status = 'failed',
          retry_count = queue_item.retry_count + 1,
          error_log = upsert_error,
          updated_at = NOW()
        WHERE id = queue_item.id;

        PERFORM notify_admin_crm_failure(agency_uuid, upsert_error, queue_item.id);
      ELSE
        UPDATE crm_sync_queue
        SET
          status = 'pending',
          retry_count = queue_item.retry_count + 1,
          error_log = upsert_error,
          updated_at = NOW() + (INTERVAL '1 second' * POWER(2, queue_item.retry_count))
        WHERE id = queue_item.id;
      END IF;

      RAISE WARNING '[crm-sync] Failed to process queue item %: %', queue_item.id, upsert_error;
    END;
  END LOOP;
END;
$$;
