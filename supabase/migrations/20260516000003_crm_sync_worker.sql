-- Migration: CRM Sync Worker + pg_cron Jobs
-- Story 5.2: Sincronización de Listings via Webhook y Batch Desacoplados
-- Created: 2026-05-16

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTION: process_crm_sync_queue()
-- Processes pending items in crm_sync_queue, upserts listings, handles retries.
-- Called by pg_cron every 5 minutes.
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
  retry_delay INTERVAL;
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

    BEGIN
      -- Upsert listing from payload
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
        'active',  -- Story 5.3 handles exclusivity validation
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
        -- NOTE: status and exclusivity_verified are NOT updated by sync (Stories 5.3, 5.4 manage those)
      ;

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

        -- Notify admin of persistent failure
        PERFORM notify_admin_crm_failure(agency_uuid, upsert_error, queue_item.id);

      ELSE
        -- 1st or 2nd failure: increment retry and reschedule
        UPDATE crm_sync_queue
        SET
          status = 'pending',
          retry_count = queue_item.retry_count + 1,
          error_log = upsert_error,
          updated_at = NOW() + (INTERVAL '1 second' * POWER(2, queue_item.retry_count))  -- Exponential backoff: 1s, 2s, 4s
        WHERE id = queue_item.id;
      END IF;

      RAISE WARNING '[crm-sync] Failed to process queue item %: %', queue_item.id, upsert_error;
    END;
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTION: notify_admin_crm_failure(agency_id, error_message, queue_item_id)
-- Called when a queue item fails 3 times. Inserts an admin notification.
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
  -- Insert admin notification for persistent CRM sync failure
  -- In production, this would also trigger the email-notifications Edge Function
  -- For now, insert into a log table for the admin dashboard to surface
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
      'message', 'CRM sync failed 3 times for queue item ' || p_queue_item_id::TEXT,
      'error', p_error_message,
      'agency_id', p_agency_id::TEXT,
      'timestamp', NOW()::TEXT
    ),
    'failed',
    0,
    'Admin notification: ' || p_error_message
  ) ON CONFLICT DO NOTHING;  -- Prevent duplicate alerts

  RAISE LOG '[crm-sync] Admin notified of CRM failure for agency %, error: %', p_agency_id, p_error_message;
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
-- Add unique constraint on (agency_id, external_id) for ON CONFLICT to work
-- This enables idempotent upserts from the queue worker
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE listings
ADD CONSTRAINT IF NOT EXISTS listings_agency_external_id_unique
UNIQUE (agency_id, external_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- pg_cron Jobs Registration
-- Enable pg_cron extension first (run once, idempotent)
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
