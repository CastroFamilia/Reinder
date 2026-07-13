/**
 * apps/web/src/features/agent-link/lib/notify-agent.ts
 *
 * Push notification utility for notifying agents via Expo Push Service.
 * Supports multiple notification types (referral.accepted, match.created).
 *
 * Story 3.2 — original: referral accepted notifications
 * Story 4.2 — extended: match.created notifications with typed data payload
 *
 * Uses Expo Push Notifications API → APNS + FCM.
 * If the agent has no registered push token, silently no-ops (never throws).
 */
import { db } from "@/lib/supabase/db";
import { pushTokens } from "@reinder/shared/db/schema";
import { eq } from "drizzle-orm";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// ─── Typed notification data payloads ─────────────────────────────────────────

export type NotificationData =
  | { type: "referral.accepted"; agentId: string }
  | {
      type: "match.created";
      listingId: string;
      buyerId: string;
      matchId?: string; // optional — for deep-link: /agent/match/[matchId] (Story 4.4)
    };

// ─── Main function ─────────────────────────────────────────────────────────────

/**
 * Send a push notification to an agent via Expo Push Service.
 * Silently no-ops if agent has no registered push token.
 * Never throws — errors are logged but not propagated.
 *
 * @param agentId  - UUID of the agent to notify
 * @param message  - Notification body text
 * @param title    - Notification title (default: 'Reinder')
 * @param data     - Typed data payload for deep-link navigation
 */
export async function notifyAgent(
  agentId: string,
  message: string,
  title = "Reinder",
  data?: NotificationData
): Promise<void> {
  try {
    const [pushToken] = await db
      .select({ token: pushTokens.token })
      .from(pushTokens)
      .where(eq(pushTokens.userId, agentId))
      .limit(1);

    if (!pushToken) {
      console.log(
        `[notifyAgent] No push token for agent ${agentId} — skipping`
      );
      return;
    }

    const payload = {
      to: pushToken.token,
      title,
      body: message,
      data: data ?? { type: "referral.accepted", agentId },
    };

    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error(`[notifyAgent] Push notification failed: ${res.status}`);
    }
  } catch (err) {
    // Never fail the main request due to notification errors
    console.error("[notifyAgent] Error sending push notification:", err);
  }
}
