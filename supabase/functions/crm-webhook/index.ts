import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * crm-webhook Edge Function (Story 5.2)
 *
 * Receives webhooks from CRM systems (e.g., Inmovilla), validates the signature,
 * enqueues the payload in crm_sync_queue, and returns 200 OK immediately.
 *
 * NFR11: NEVER processes listings in the request path. Queue + worker pattern only.
 * Security: HMAC-SHA256 signature validation using agency's webhook secret.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/**
 * Compute HMAC-SHA256 signature for payload validation.
 */
async function computeHMAC(secret: string, body: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const bodyData = encoder.encode(body);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, bodyData);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req: Request) => {
  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Read raw body BEFORE parsing (needed for signature verification)
    const body = await req.text();

    // --- Validate JSON ---
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(body);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // --- Identify the agency from the API Key header ---
    const apiKey = req.headers.get("X-Inmovilla-Api-Key");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing X-Inmovilla-Api-Key header" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Lookup the agency connection by searching for matching credentials
    // The api_key is stored in credentials_encrypted as a JSON string
    const { data: connections, error: dbError } = await supabase
      .from("agency_crm_connections")
      .select("id, agency_id, credentials_encrypted, crm_type")
      .eq("crm_type", "inmovilla")
      .eq("status", "active");

    if (dbError || !connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ error: "No active CRM connection found" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Find the connection matching the API key
    let matchedConnection: {
      id: string;
      agency_id: string;
      credentials_encrypted: string;
      crm_type: string;
    } | null = null;

    for (const conn of connections) {
      try {
        const creds = JSON.parse(conn.credentials_encrypted);
        if (creds.api_key === apiKey) {
          matchedConnection = conn;
          break;
        }
      } catch {
        // Skip malformed credentials
        continue;
      }
    }

    if (!matchedConnection) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // --- Validate HMAC-SHA256 signature (if provided) ---
    const signature = req.headers.get("X-Inmovilla-Signature");
    if (signature) {
      let webhookSecret: string | null = null;
      try {
        const creds = JSON.parse(matchedConnection.credentials_encrypted);
        webhookSecret = creds.webhook_secret || null;
      } catch {
        webhookSecret = null;
      }

      if (webhookSecret) {
        const expectedSig = await computeHMAC(webhookSecret, body);
        if (signature !== expectedSig) {
          return new Response(
            JSON.stringify({ error: "Invalid webhook signature" }),
            {
              status: 401,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      }
    }

    // --- Enqueue payload in crm_sync_queue (NFR11: only operation allowed) ---
    const { error: insertError } = await supabase
      .from("crm_sync_queue")
      .insert({
        agency_id: matchedConnection.agency_id,
        payload,
        status: "pending",
        retry_count: 0,
        error_log: null,
      });

    if (insertError) {
      console.error("[crm-webhook] Queue insert failed:", insertError.message);
      // Return 202 Accepted — payload received but couldn't enqueue (graceful degradation)
      return new Response(
        JSON.stringify({ success: false, message: "Event received but could not be queued" }),
        {
          status: 202,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      `[crm-webhook] Enqueued event for agency ${matchedConnection.agency_id}, action: ${payload.action || "unknown"}`
    );

    // --- Return 200 OK immediately --- (worker processes asynchronously via pg_cron)
    return new Response(
      JSON.stringify({ success: true, message: "Event queued for processing" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[crm-webhook] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
