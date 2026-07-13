import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/supabase/db';
import { agencyCrmConnections, listings } from '@reinder/shared/db/schema';
import { eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 });
  }

  // Verify agency_admin role
  const { data: profile } = await supabase.from('user_profiles').select('role, agency_id').eq('id', user.id).single();
  if (profile?.role !== 'agency_admin' || !profile.agency_id) {
    return Response.json({ data: null, error: { code: 'FORBIDDEN', message: 'Agency Admin role required' } }, { status: 403 });
  }

  const payload = await req.json();
  const { crmType, apiKey, webhookUrl } = payload;

  if (!crmType || !apiKey) {
    return Response.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Missing crmType or apiKey' } }, { status: 400 });
  }

  try {
    // Upsert connection as pending_sync
    const result = await db.insert(agencyCrmConnections).values({
      agencyId: profile.agency_id,
      crmType,
      credentialsEncrypted: apiKey, // In a real app, encrypt this or use a secure vault
      status: 'pending_sync',
    }).onConflictDoUpdate({
      target: [agencyCrmConnections.id], // Assuming standard conflict handling
      set: {
        crmType,
        credentialsEncrypted: apiKey,
        status: 'pending_sync',
        updatedAt: new Date(),
      }
    }).returning();

    const connection = result[0];

    // Mock an initial sync: Wait 2s, insert mock listings, update status to active
    setTimeout(async () => {
      console.log(`[MOCK SYNC] Simulating initial import for agency ${profile.agency_id}`);
      
      // We would normally fetch from the CRM here.
      // For the mock, we just update the connection to active to unblock the UI.
      await db.update(agencyCrmConnections)
        .set({ status: 'active', updatedAt: new Date() })
        .where(eq(agencyCrmConnections.id, connection.id));
        
      console.log(`[MOCK SYNC] Completed for connection ${connection.id}`);
    }, 2000);

    return Response.json({ data: connection, error: null }, { status: 200 });

  } catch (error: any) {
    console.error('Error saving CRM connection:', error);
    return Response.json({ data: null, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 });
  }
}
