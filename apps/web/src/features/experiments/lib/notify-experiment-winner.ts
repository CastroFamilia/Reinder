/**
 * apps/web/src/features/experiments/lib/notify-experiment-winner.ts
 *
 * Push notification utility for notifying agency admins when an experiment
 * declares a winner. Follows the same fire-and-forget pattern as notify-agent.ts.
 *
 * Story 9.4 — AC7
 * Uses Expo Push Notifications API → APNS + FCM.
 * Never throws — errors are logged but never propagate to the caller.
 */
import { db } from "@/lib/supabase/db";
import { pushTokens, userProfiles } from "@reinder/shared/db/schema";
import { eq, and } from "drizzle-orm";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/**
 * Notify agency admins that an experiment has declared a winner.
 * Fire-and-forget: never blocks the main process.
 *
 * @param agencyId - UUID of the agency that owns the experiment
 * @param experimentName - Human-readable experiment name
 * @param winnerVariant - 'a' or 'b'
 */
export async function notifyExperimentWinner(
  agencyId: string,
  experimentName: string,
  winnerVariant: "a" | "b"
): Promise<void> {
  try {
    // Lookup agency_admin users for this agency
    const admins = await db
      .select({ userId: userProfiles.id })
      .from(userProfiles)
      .where(
        and(
          eq(userProfiles.agencyId, agencyId),
          eq(userProfiles.role, "agency_admin")
        )
      );

    for (const admin of admins) {
      const [token] = await db
        .select({ token: pushTokens.token })
        .from(pushTokens)
        .where(eq(pushTokens.userId, admin.userId))
        .limit(1);

      if (!token) continue;

      // Fire-and-forget — void the promise intentionally
      void fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          to: token.token,
          title: "Experimento completado 🏆",
          body: `"${experimentName}": Variante ${winnerVariant.toUpperCase()} es la ganadora`,
          data: { type: "experiment.completed", agencyId },
        }),
      }).catch((err) =>
        console.error("[notifyExperimentWinner] Push failed:", err)
      );
    }
  } catch (err) {
    // Fire-and-forget — never block the main process
    console.error("[notifyExperimentWinner] Error:", err);
  }
}
