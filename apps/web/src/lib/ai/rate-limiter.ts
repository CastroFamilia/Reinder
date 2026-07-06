/**
 * Rate limiter for AI variant generation — per agency, rolling 24h window.
 *
 * Story 9.6, AC3 — max 10 generations per agency per 24 hours.
 *
 * Records usage AFTER successful generation only (failures don't count).
 */

import { db } from "@/lib/supabase/db";
import { aiGenerationUsage } from "@reinder/shared/db/schema";
import { eq, and, gte, count } from "drizzle-orm";
import { MAX_AI_GENERATIONS_PER_DAY } from "@reinder/shared/constants";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
};

/**
 * Check if the agency has remaining AI generation quota for the current 24h window.
 */
export async function checkRateLimit(
  agencyId: string
): Promise<RateLimitResult> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [result] = await db
    .select({ total: count() })
    .from(aiGenerationUsage)
    .where(
      and(
        eq(aiGenerationUsage.agencyId, agencyId),
        gte(aiGenerationUsage.createdAt, twentyFourHoursAgo)
      )
    );

  const used = result?.total ?? 0;
  const remaining = Math.max(0, MAX_AI_GENERATIONS_PER_DAY - used);

  if (remaining === 0) {
    // Simplified: retry in 1 hour
    return { allowed: false, remaining: 0, retryAfterSeconds: 3600 };
  }

  return { allowed: true, remaining };
}

/**
 * Record a successful AI generation usage entry.
 * Called ONLY after successful generation — failures must NOT increment the counter.
 */
export async function recordUsage(params: {
  agencyId: string;
  listingId: string;
  userId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
}) {
  await db.insert(aiGenerationUsage).values({
    agencyId: params.agencyId,
    listingId: params.listingId,
    userId: params.userId,
    model: params.model,
    promptTokens: params.promptTokens,
    completionTokens: params.completionTokens,
  });
}
