/**
 * apps/web/src/features/agent-link/lib/referral-url.ts
 *
 * Shared utility for building referral URLs.
 * Used by the API route (server) and the agent page (server component).
 * Story 3.1 — Code review fix (avoid duplication).
 */

export function buildReferralUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://reinder.app';
  return `${base}/referral/${token}`;
}
