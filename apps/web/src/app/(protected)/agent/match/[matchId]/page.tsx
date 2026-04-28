/**
 * apps/web/src/app/(protected)/agent/match/[matchId]/page.tsx
 *
 * Deep-link destination for agent match notifications.
 * Route: /agent/match/[matchId]
 *
 * Server Component: loads match detail via API.
 * Passes to MatchDetailPage Client Component.
 *
 * Works for:
 * - Cold start: app opens directly to this URL from push notification
 * - Background: app resumes at this URL when notification tapped
 *
 * Story 4.4 — UX-DR14
 */
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { MatchDetailPage } from "@/features/agent-panel/components/MatchDetailPage";
import type { MatchDetail } from "@/app/api/v1/agent/match/[matchId]/route";
import { GET } from "@/app/api/v1/agent/match/[matchId]/route";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Detalle del Match — Reinder",
    description: "Información completa del match de tu cliente",
  };
}

export default async function AgentMatchDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;

  // ─── Auth ──────────────────────────────────────────────────────────────────

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ─── Fetch match detail via route handler ──────────────────────────────────
  // We call the GET handler directly (same process) for SSR efficiency

  const mockReq = new Request(
    `http://localhost/api/v1/agent/match/${matchId}`
  );
  const res = await GET(mockReq as any, {
    params: Promise.resolve({ matchId }),
  });

  if (res.status === 404) {
    notFound();
  }

  if (res.status === 401) {
    redirect("/login");
  }

  if (res.status === 403) {
    redirect("/agent");
  }

  const json = await res.json();
  const match: MatchDetail = json.data;

  return <MatchDetailPage match={match} />;
}
