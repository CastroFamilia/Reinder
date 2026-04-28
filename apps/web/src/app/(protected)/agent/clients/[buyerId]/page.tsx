/**
 * apps/web/src/app/(protected)/agent/clients/[buyerId]/page.tsx
 *
 * Client history page — Historial de Matches y Rechazos por Cliente
 *
 * Server Component: loads client history via API + validates bond ownership.
 * Renders ClientHistoryPage Client Component with initial data (SSR).
 * Updates agentLastSeenAt via the history API call (clears hasNewMatches badge).
 *
 * Story 4.3
 * Source: story 4-3-historial-matches-rechazos-cliente.md
 */
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import {
  userProfiles,
  agentBuyerBonds,
} from "@reinder/shared/db/schema";
import { eq, and } from "drizzle-orm";
import type { Metadata } from "next";
import { ClientHistoryPage } from "@/features/agent-panel/components/ClientHistoryPage";
import type { ClientHistoryResponse } from "@/app/api/v1/agent/clients/[buyerId]/history/route";

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ buyerId: string }>;
}): Promise<Metadata> {
  const { buyerId } = await params;
  return {
    title: `Historial de cliente — Reinder`,
    description: `Historial de matches y rechazos del cliente ${buyerId}`,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ClientHistoryRoute({
  params,
  searchParams,
}: {
  params: Promise<{ buyerId: string }>;
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}) {
  const { buyerId } = await params;
  const { page = "1", pageSize = "20" } = await searchParams;

  // ─── 1. Auth ─────────────────────────────────────────────────────────────────

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ─── 2. Verify agent role + bond ownership ────────────────────────────────────

  const [profile] = await db
    .select({ role: userProfiles.role })
    .from(userProfiles)
    .where(eq(userProfiles.id, user.id))
    .limit(1);

  if (!profile || profile.role !== "agent") {
    redirect("/swipe");
  }

  const [bond] = await db
    .select({
      id: agentBuyerBonds.id,
      buyerId: agentBuyerBonds.buyerId,
    })
    .from(agentBuyerBonds)
    .where(
      and(
        eq(agentBuyerBonds.agentId, user.id),
        eq(agentBuyerBonds.buyerId, buyerId),
        eq(agentBuyerBonds.status, "active")
      )
    )
    .limit(1);

  if (!bond) {
    notFound();
  }

  // ─── 3. Get buyer name ────────────────────────────────────────────────────────

  const [buyerProfile] = await db
    .select({ fullName: userProfiles.fullName })
    .from(userProfiles)
    .where(eq(userProfiles.id, buyerId))
    .limit(1);

  // ─── 4. Fetch history via internal API (reuse handler logic) ─────────────────
  //
  // We call the history API endpoint with cookie forwarding so auth is preserved.
  // This keeps the logic DRY and ensures agentLastSeenAt is updated.

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const historyUrl = new URL(
    `/api/v1/agent/clients/${buyerId}/history`,
    baseUrl
  );
  historyUrl.searchParams.set("page", page);
  historyUrl.searchParams.set("pageSize", pageSize);

  // Pass cookies for server-side auth
  const cookieHeader = (await supabase.auth.getSession()).data.session
    ? `sb-access-token=${(await supabase.auth.getSession()).data.session!.access_token}`
    : "";

  let history: ClientHistoryResponse;

  try {
    const res = await fetch(historyUrl.toString(), {
      headers: {
        Cookie: cookieHeader,
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token ?? ""}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      notFound();
    }

    const json = await res.json();
    history = json.data;
  } catch {
    // Fallback: empty history if API fails
    history = {
      matches: [],
      rejects: [],
      totalMatches: 0,
      totalRejects: 0,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
    };
  }

  return (
    <ClientHistoryPage
      history={history}
      buyerName={buyerProfile?.fullName ?? null}
      buyerId={buyerId}
    />
  );
}
