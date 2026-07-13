/**
 * apps/web/src/app/(protected)/agent/page.tsx
 *
 * Panel del Agente — Stories 3.1 + 4.1 + 4.2
 *
 * Story 3.1: Referral link generation
 * Story 4.1: Client list (SSR)
 * Story 4.2: Realtime badge updates via AgentDashboard Client Component
 *
 * Server Component: loads tokens + clients via Drizzle (SSR).
 * Guard: only `agent` role can access — redirects otherwise.
 * Client boundary: AgentDashboard handles Supabase Realtime WebSocket.
 *
 * Source: story 4-2-notificacion-tiempo-real-match-cliente.md (Task 5)
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import {
  referralTokens,
  userProfiles,
  agentBuyerBonds,
  matchEvents,
} from "@reinder/shared/db/schema";
import { eq, and, count, max, desc, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { ReferralLinkGenerator } from "@/features/agent-link/components/referral-link-generator";
import { buildReferralUrl } from "@/features/agent-link/lib/referral-url";
import type { ReferralTokenWithStatus } from "@/app/api/v1/referral-tokens/route";
import { AgentDashboard } from "@/features/agent-panel/components/AgentDashboard";
import type { AgentClient } from "@reinder/shared/types/agent";

export const metadata: Metadata = {
  title: "Panel del Agente — Reinder",
  description:
    "Panel de gestión de clientes y links de referral del agente representante.",
};

// ─── Status helper ──────────────────────────────────────────────────────────────

type TokenStatus = "pending" | "accepted" | "expired";

function computeStatus(used: boolean, expiresAt: Date): TokenStatus {
  if (used) return "accepted";
  if (expiresAt < new Date()) return "expired";
  return "pending";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AgentDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Verify role — only agents can access this route
  const [profile] = await db
    .select({ role: userProfiles.role })
    .from(userProfiles)
    .where(eq(userProfiles.id, user.id))
    .limit(1);

  if (!profile || profile.role !== "agent") {
    redirect("/swipe");
  }

  // ─── Load referral tokens (Story 3.1) ───────────────────────────────────────

  const rawTokens = await db
    .select()
    .from(referralTokens)
    .where(eq(referralTokens.agentId, user.id))
    .orderBy(desc(referralTokens.createdAt));

  const initialTokens: ReferralTokenWithStatus[] = rawTokens.map((t) => ({
    id: t.id,
    agentId: t.agentId,
    buyerId: t.buyerId ?? null,
    token: t.token,
    referralUrl: buildReferralUrl(t.token),
    used: t.used,
    expiresAt: t.expiresAt.toISOString(),
    createdAt: t.createdAt.toISOString(),
    status: computeStatus(t.used, t.expiresAt),
  }));

  // ─── Load bonded clients (Story 4.1) ────────────────────────────────────────

  const clientRows = await db
    .select({
      bondId: agentBuyerBonds.id,
      buyerId: agentBuyerBonds.buyerId,
      buyerName: userProfiles.fullName,
      buyerAvatarUrl: userProfiles.avatarUrl,
      bondCreatedAt: agentBuyerBonds.createdAt,
      agentLastSeenAt: agentBuyerBonds.agentLastSeenAt,
      totalMatches: count(matchEvents.id),
      lastMatchAt: max(matchEvents.createdAt),
    })
    .from(agentBuyerBonds)
    .leftJoin(userProfiles, eq(userProfiles.id, agentBuyerBonds.buyerId))
    .leftJoin(matchEvents, eq(matchEvents.buyerId, agentBuyerBonds.buyerId))
    .where(
      and(
        eq(agentBuyerBonds.agentId, user.id),
        eq(agentBuyerBonds.status, "active")
      )
    )
    .groupBy(
      agentBuyerBonds.id,
      agentBuyerBonds.buyerId,
      agentBuyerBonds.createdAt,
      agentBuyerBonds.agentLastSeenAt,
      userProfiles.fullName,
      userProfiles.avatarUrl
    )
    .orderBy(
      sql`MAX(${matchEvents.createdAt}) DESC NULLS LAST`,
      desc(agentBuyerBonds.createdAt)
    );

  const initialClients: AgentClient[] = clientRows.map((row) => {
    const lastMatchAt = row.lastMatchAt ?? null;
    const agentLastSeenAt = row.agentLastSeenAt ?? null;
    let hasNewMatches = false;
    if (lastMatchAt) {
      hasNewMatches = agentLastSeenAt ? lastMatchAt > agentLastSeenAt : true;
    }
    return {
      bondId: row.bondId,
      buyerId: row.buyerId,
      buyerName: row.buyerName ?? null,
      buyerAvatarUrl: row.buyerAvatarUrl ?? null,
      bondCreatedAt: row.bondCreatedAt.toISOString(),
      totalMatches: row.totalMatches,
      lastMatchAt: lastMatchAt?.toISOString() ?? null,
      hasNewMatches,
    };
  });

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "48px 24px",
        background:
          "radial-gradient(ellipse at center, rgba(255,107,0,0.12) 0%, #0D0D0D 70%)",
        color: "#F5F0E8",
        fontFamily: "'Inter', system-ui, sans-serif",
        gap: "40px",
      }}
    >
      {/* Header */}
      <div
        style={{
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div style={{ fontSize: "40px" }}>🤝</div>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color: "#FF6B00",
            margin: 0,
          }}
        >
          Panel del Agente
        </h1>
        <p style={{ color: "#9E9080", margin: 0, fontSize: "14px" }}>
          Gestiona tus clientes y links de referral
        </p>
        <p style={{ color: "#9E9080", margin: 0, fontSize: "12px" }}>
          Sesión: {user.email}
        </p>
      </div>

      {/* ─── Section: Referral Links (Story 3.1) ─── */}
      <section style={{ width: "100%", maxWidth: "672px" }}>
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "#FF6B00",
            marginBottom: "16px",
          }}
        >
          Links de Referral
        </h2>
        <ReferralLinkGenerator initialTokens={initialTokens} />
      </section>

      {/* ─── Section: Clientes Vinculados (Stories 4.1 + 4.2) ─── */}
      <section style={{ width: "100%", maxWidth: "672px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <h2
            style={{ fontSize: "16px", fontWeight: 600, color: "#FF6B00" }}
          >
            Clientes Vinculados
          </h2>
          {initialClients.length > 0 && (
            <span
              style={{
                fontSize: "12px",
                color: "#9E9080",
                background: "rgba(255,107,0,0.1)",
                borderRadius: "12px",
                padding: "2px 10px",
              }}
            >
              {initialClients.length}{" "}
              {initialClients.length === 1 ? "cliente" : "clientes"}
            </span>
          )}
        </div>

        {/* AgentDashboard: Client Component with Realtime subscription (Story 4.2) */}
        <AgentDashboard
          initialClients={initialClients}
          agentId={user.id}
        />
      </section>
    </main>
  );
}
