"use client";

/**
 * apps/web/src/features/agent-panel/components/ClientHistoryPage.tsx
 *
 * Client History view — shows two sections: Matches and Rechazados.
 * Rendered as a Client Component to support pagination state.
 *
 * Story 4.3 — Task 2
 * Source: story 4-3-historial-matches-rechazos-cliente.md
 */

import Link from "next/link";
import { useState } from "react";
import type {
  ClientHistoryResponse,
  MatchHistoryItem,
  RejectHistoryItem,
} from "@/app/api/v1/agent/clients/[buyerId]/history/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: string | null): string {
  if (!price) return "Precio no disponible";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(parseFloat(price));
}

function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(isoDate));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MatchCard({ item }: { item: MatchHistoryItem }) {
  return (
    <Link href={`/listings/${item.listingId}`} className="no-underline">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/15 transition-all duration-200 cursor-pointer">
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-white/10">
          {item.listingImageUrl ? (
            <img
              src={item.listingImageUrl}
              alt={item.listingTitle ?? "Propiedad"}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-2xl">🏠</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {item.listingTitle ?? "Propiedad sin título"}
          </p>
          <p className="text-xs text-white/60 truncate">
            {item.listingAddress ?? "Dirección no disponible"}
          </p>
          <p className="text-xs font-medium text-orange-400 mt-0.5">
            {formatPrice(item.listingPrice)}
          </p>
        </div>

        {/* Date */}
        <div className="flex-shrink-0 text-right">
          <span className="text-xs text-white/40">{formatDate(item.matchedAt)}</span>
          <div className="mt-1">
            <span className="inline-flex items-center gap-1 text-xs bg-orange-500/20 text-orange-400 rounded-full px-2 py-0.5 font-medium">
              ❤️ Match
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function RejectCard({ item }: { item: RejectHistoryItem }) {
  return (
    <Link href={`/listings/${item.listingId}`} className="no-underline">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200 cursor-pointer">
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-white/5 grayscale opacity-60">
          {item.listingImageUrl ? (
            <img
              src={item.listingImageUrl}
              alt={item.listingTitle ?? "Propiedad"}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-2xl opacity-40">🏠</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white/60 truncate">
            {item.listingTitle ?? "Propiedad sin título"}
          </p>
          <p className="text-xs text-white/40 truncate">
            {item.listingAddress ?? "Dirección no disponible"}
          </p>
          <p className="text-xs text-white/40 mt-0.5">
            {formatPrice(item.listingPrice)}
          </p>
        </div>

        {/* Date */}
        <div className="flex-shrink-0 text-right">
          <span className="text-xs text-white/30">{formatDate(item.rejectedAt)}</span>
          <div className="mt-1">
            <span className="inline-flex items-center gap-1 text-xs bg-white/5 text-white/30 rounded-full px-2 py-0.5 font-medium">
              ✕ Pasó
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab = "matches" | "rejects";

// ─── Main Component ───────────────────────────────────────────────────────────

interface ClientHistoryPageProps {
  history: ClientHistoryResponse;
  buyerName: string | null;
  buyerId: string;
}

export function ClientHistoryPage({
  history,
  buyerName,
  buyerId,
}: ClientHistoryPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>("matches");

  const displayName = buyerName ?? "Cliente";

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "24px 16px",
        background:
          "radial-gradient(ellipse at center, rgba(255,107,0,0.10) 0%, #0D0D0D 70%)",
        color: "#F5F0E8",
        fontFamily: "'Inter', system-ui, sans-serif",
        gap: "20px",
        maxWidth: "672px",
        margin: "0 auto",
      }}
    >
      {/* Back link */}
      <Link
        href="/agent"
        className="flex items-center gap-1 text-sm text-white/50 hover:text-white/80 transition-colors no-underline"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Panel del Agente
      </Link>

      {/* Header */}
      <div>
        <h1
          style={{
            fontSize: "22px",
            fontWeight: 700,
            color: "#FF6B00",
            margin: "0 0 4px 0",
          }}
        >
          {displayName}
        </h1>
        <p style={{ color: "#9E9080", margin: 0, fontSize: "13px" }}>
          {history.totalMatches} matches · {history.totalRejects} rechazados
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          background: "rgba(255,255,255,0.06)",
          borderRadius: "12px",
          padding: "4px",
          gap: "4px",
        }}
      >
        <button
          onClick={() => setActiveTab("matches")}
          style={{
            flex: 1,
            padding: "8px",
            borderRadius: "8px",
            border: "none",
            background: activeTab === "matches" ? "rgba(255,107,0,0.25)" : "transparent",
            color: activeTab === "matches" ? "#FF6B00" : "#9E9080",
            fontWeight: activeTab === "matches" ? 600 : 400,
            fontSize: "14px",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          ❤️ Matches ({history.totalMatches})
        </button>
        <button
          onClick={() => setActiveTab("rejects")}
          style={{
            flex: 1,
            padding: "8px",
            borderRadius: "8px",
            border: "none",
            background: activeTab === "rejects" ? "rgba(255,255,255,0.08)" : "transparent",
            color: activeTab === "rejects" ? "#F5F0E8" : "#9E9080",
            fontWeight: activeTab === "rejects" ? 600 : 400,
            fontSize: "14px",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          ✕ Rechazados ({history.totalRejects})
        </button>
      </div>

      {/* Content */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {activeTab === "matches" && (
          <>
            {history.matches.length === 0 ? (
              <p style={{ color: "#9E9080", textAlign: "center", padding: "32px 0", margin: 0 }}>
                Sin matches aún
              </p>
            ) : (
              history.matches.map((item) => (
                <MatchCard key={item.matchId} item={item} />
              ))
            )}
          </>
        )}
        {activeTab === "rejects" && (
          <>
            {history.rejects.length === 0 ? (
              <p style={{ color: "#9E9080", textAlign: "center", padding: "32px 0", margin: 0 }}>
                Sin rechazados aún
              </p>
            ) : (
              history.rejects.map((item) => (
                <RejectCard key={item.rejectId} item={item} />
              ))
            )}
          </>
        )}
      </div>

      {/* Pagination notice */}
      {(history.totalMatches > history.pageSize ||
        history.totalRejects > history.pageSize) && (
        <p style={{ color: "#9E9080", fontSize: "12px", textAlign: "center", margin: 0 }}>
          Mostrando {history.pageSize} de {activeTab === "matches" ? history.totalMatches : history.totalRejects} resultados
        </p>
      )}
    </main>
  );
}
