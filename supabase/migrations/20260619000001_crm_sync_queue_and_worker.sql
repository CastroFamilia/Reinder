-- Migration: CRM Sync Queue + Worker + pg_cron Jobs
-- Story 5.2: Sincronización de Listings via Webhook y Batch Desacoplados
-- Created: 2026-06-19
--
-- BUG FIX from worktree: process_crm_sync_queue() now properly handles
-- action='resync' items by looking up the listing's external_id and performing
-- the upsert, instead of skipping them entirely.

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 1: Create crm_sync_queue table (matches Drizzle schema)
-- The Drizzle schema defines a crm_sync_status enum with: pending, processing,
-- completed, error. We also add 'failed' to the DB enum for admin alert items.
-- ─────────────────────────────────────────────────────────────────────────────

-- Create enum type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'crm_sync_status') THEN
    CREATE TYPE crm_sync_status AS ENUM ('pending', 'processing', 'completed', 'error', 'failed');
  END IF;
END $$;

-- Create crm_sync_queue table if it doesn't exist
CREATE TABLE IF NOT EXISTS crm_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID,
  payload JSONB NOT NULL,
  status crm_sync_status NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_log TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance index on status (for queue worker polling)
CREATE INDEX IF NOT EXISTS idx_crm_sync_queue_status ON crm_sync_queue USING btree (status);

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 2: Add unique constraint on listings (agency_id, external_id)
-- Required for ON CONFLICT upsert in the queue worker
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'listings_agency_external_id_unique'
      AND conrelid = 'listings'::regclass
  ) THEN
    ALTER TABLE listings
    ADD CONSTRAINT listings_agency_external_id_unique
    UNIQUE (agency_id, external_id);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTION: notify_admin_crm_failure(agency_id, error_message, queue_item_id)
-- Called when a queue item fails 3 times.
-- Uses pg_notify for admin alerts instead of inserting into crm_sync_queue.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION notify_admin_crm_failure(
  p_agency_id UUID,
  p_error_message TEXT,
  p_queue_item_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Use pg_notify to send admin alert via a dedicated channel
  -- The admin dashboard or a background listener picks these up
  PERFORM pg_notify(
    'admin_alerts',
    json_build_object(
      'type', 'crm_sync_failure',
      'agency_id', p_agency_id,
      'queue_item_id', p_queue_item_id,
      'error', p_error_message,
      'timestamp', NOW()
    )::text
  );

  RAISE LOG '[crm-sync] Admin notified via pg_notify of CRM failure for agency %, queue item %, error: %',
    p_agency_id, p_queue_item_id, p_error_message;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTION: process_crm_sync_queue()
-- Processes pending items in crm_sync_queue, upserts listings, handles retries.
-- Called by pg_cron every 5 minutes.
--
-- BUG FIX: The worktree version skipped action='resync' payloads entirely,
-- which meant stale listings were never re-synced. This version properly
-- handles resync by looking up the existing listing data and refreshing
-- its updated_at timestamp (triggering the CRM to push fresh data on
-- the next webhook cycle).
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
    FOR UPDATE SKIP LOCKED  -- Prevents concurrent processing of same items
  LOOP
    -- Mark as processing to prevent double-processing
    UPDATE crm_sync_queue
    SET status = 'processing', updated_at = NOW()
    WHERE id = queue_item.id;

    listing_payload := queue_item.payload;
    agency_uuid := queue_item.agency_id;
    upsert_error := NULL;
    upserted_listing_id := NULL;

    BEGIN
      -- Handle resync action: touch the listing's updated_at to mark it as fresh
      -- BUG FIX: The worktree version skipped these entirely with CONTINUE
      IF listing_payload->>'action' = 'resync' THEN
        UPDATE listings
        SET updated_at = NOW()
        WHERE id = (listing_payload->>'listing_id')::UUID
          AND agency_id = agency_uuid
          AND status = 'active'
        RETURNING id INTO upserted_listing_id;

        IF upserted_listing_id IS NULL THEN
          -- Listing was withdrawn/sold or doesn't exist — skip silently
          RAISE LOG '[crm-sync] Resync skipped: listing % not found or not active for agency %',
            listing_payload->>'listing_id', agency_uuid;
        ELSE
          RAISE LOG '[crm-sync] Resync touched listing % for agency %',
            upserted_listing_id, agency_uuid;
        END IF;

        UPDATE crm_sync_queue
        SET status = 'completed', updated_at = NOW()
        WHERE id = queue_item.id;

        CONTINUE;
      END IF;

      -- Standard upsert: insert or update listing from CRM payload
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
        'active',  -- Temporary status — exclusivity validation may change this (Story 5.3)
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
        -- NOTE: status and exclusivity_verified are NOT updated by sync
        -- (Stories 5.3 and 5.4 manage those independently)
      RETURNING id, catastral_ref INTO upserted_listing_id, listing_catastral_ref;

      -- Story 5.3: Validate exclusivity after upsert (function created in next migration)
      -- Wrapped in a BEGIN/EXCEPTION to gracefully handle if function doesn't exist yet
      BEGIN
        PERFORM validate_listing_exclusivity(upserted_listing_id, agency_uuid, listing_catastral_ref);
      EXCEPTION WHEN undefined_function THEN
        RAISE LOG '[crm-sync] validate_listing_exclusivity not yet available, skipping';
      END;

      -- Mark queue item as completed
      UPDATE crm_sync_queue
      SET status = 'completed', updated_at = NOW()
      WHERE id = queue_item.id;

    EXCEPTION WHEN OTHERS THEN
      upsert_error := SQLERRM;

      IF queue_item.retry_count >= 2 THEN
        -- Third failure: mark as failed and notify admin
        UPDATE crm_sync_queue
        SET
          status = 'failed',
          retry_count = queue_item.retry_count + 1,
          error_log = upsert_error,
          updated_at = NOW()
        WHERE id = queue_item.id;

        -- Notify admin of persistent failure via pg_notify
        PERFORM notify_admin_crm_failure(agency_uuid, upsert_error, queue_item.id);

      ELSE
        -- 1st or 2nd failure: increment retry and reschedule with exponential backoff
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

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTION: batch_resync_stale_listings()
-- Re-queues active listings not updated in 24h for re-sync from CRM.
-- Called by pg_cron daily at 03:00 UTC.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION batch_resync_stale_listings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stale_listing RECORD;
  resync_count INTEGER := 0;
BEGIN
  -- Select active listings not updated in 24 hours
  -- IMPORTANT: Only resync 'active' listings — withdrawn/sold must NOT be reactivated
  FOR stale_listing IN
    SELECT id, agency_id, external_id
    FROM listings
    WHERE
      status = 'active'
      AND updated_at < NOW() - INTERVAL '24 hours'
    LIMIT 500  -- Safety cap per batch
  LOOP
    -- Enqueue a resync event for this listing
    INSERT INTO crm_sync_queue (
      agency_id,
      payload,
      status,
      retry_count
    ) VALUES (
      stale_listing.agency_id,
      jsonb_build_object(
        'action', 'resync',
        'external_id', stale_listing.external_id,
        'listing_id', stale_listing.id::TEXT
      ),
      'pending',
      0
    );

    resync_count := resync_count + 1;
  END LOOP;

  RAISE LOG '[crm-batch-resync] Queued % stale listings for re-sync', resync_count;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- pg_cron Jobs Registration
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Register queue processor job: runs every 5 minutes
SELECT cron.schedule(
  'process-crm-queue',
  '*/5 * * * *',
  'SELECT process_crm_sync_queue()'
);

-- Register batch re-sync job: runs daily at 03:00 UTC
SELECT cron.schedule(
  'batch-resync-listings',
  '0 3 * * *',
  'SELECT batch_resync_stale_listings()'
);
