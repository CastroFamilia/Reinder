import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Edge Function to receive webhooks from CRM (e.g., Inmovilla)
// Deployed to Supabase. This endpoint should just enqueue the payload
// into a DB table (e.g. crm_webhook_events) and return 200 OK immediately
// to prevent timeout and decoupling the sync process (NFR11).

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const payload = await req.json();
    
    // TODO: Story 5.2 - Validate payload signature / API Key here
    // TODO: Story 5.2 - Insert into crm_webhook_events table

    console.log('[crm-webhook] Received payload:', JSON.stringify(payload).substring(0, 100));

    // Return 200 immediately
    return new Response(JSON.stringify({ success: true, message: 'Event queued' }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error('[crm-webhook] Error processing request:', error);
    return new Response(JSON.stringify({ error: 'Invalid payload' }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
});
