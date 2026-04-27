/**
 * apps/web/src/features/agent-link/lib/notify-agent.ts
 *
 * Push notification stub for notifying an agent when a buyer accepts their bond.
 * Story 3.2 — Task 3
 *
 * Uses Expo Push Notifications API.
 * If the agent has no registered push token, silently skips.
 */
import { db } from '@/lib/supabase/db';
import { pushTokens } from '@reinder/shared/db/schema';
import { eq } from 'drizzle-orm';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send a push notification to an agent.
 * Silently no-ops if agent has no registered push token.
 */
export async function notifyAgent(agentId: string, message: string, title = 'Reinder'): Promise<void> {
  try {
    const [pushToken] = await db
      .select({ token: pushTokens.token })
      .from(pushTokens)
      .where(eq(pushTokens.userId, agentId))
      .limit(1);

    if (!pushToken) {
      console.log(`[notifyAgent] No push token for agent ${agentId} — skipping`);
      return;
    }

    const payload = {
      to: pushToken.token,
      title,
      body: message,
      data: { type: 'referral.accepted', agentId },
    };

    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error(`[notifyAgent] Push notification failed: ${res.status}`);
    }
  } catch (err) {
    // Never fail the main request due to notification errors
    console.error('[notifyAgent] Error sending push notification:', err);
  }
}
