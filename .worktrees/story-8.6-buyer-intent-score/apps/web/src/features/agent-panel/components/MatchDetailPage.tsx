"use client";

/**
 * apps/web/src/features/agent-panel/components/MatchDetailPage.tsx
 *
 * Deep-link destination for agent match notifications.
 * Shows full property + buyer context + "Marcar como gestionado" button.
 *
 * Story 4.4
 * Source: story 4-4-deep-link-notificacion-detalle-match.md
 * UX-DR14: deep link notificación → detalle match (no pasos intermedios)
 */

import Link from "next/link";
import { useState } from "react";
import type { MatchDetail } from "@/app/api/v1/agent/match/[matchId]/route";

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
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoDate));
}

// ─── Component ────────────────────────────────────────────────────────────────

interface MatchDetailPageProps {
  match: MatchDetail;
}

export function MatchDetailPage({ match }: MatchDetailPageProps) {
  const [gestionado, setGestionado] = useState(!!match.confirmedAt);
  const [loading, setLoading] = useState(false);

  const handleMarcarGestionado = async () => {
    if (gestionado || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/agent/match/${match.matchId}`, {
        method: "PATCH",
      });
      if (res.ok) {
        setGestionado(true);
      }
    } catch (err) {
      console.error("[MatchDetail] Error marcando como gestionado:", err);
    } finally {
      setLoading(false);
    }
  };

  const mainImage = match.listingImages[0] ?? null;
  const buyerInitials = match.buyerName
    ? match.buyerName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "24px 16px",
        background:
          "radial-gradient(ellipse at top, rgba(255,107,0,0.15) 0%, #0D0D0D 60%)",
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

      {/* Match Badge */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          background: "rgba(255,107,0,0.2)",
          color: "#FF6B00",
          borderRadius: "12px",
          padding: "4px 12px",
          fontSize: "13px",
          fontWeight: 600,
        }}>
          ❤️ Nuevo Match
        </span>
        <span style={{ fontSize: "12px", color: "#9E9080" }}>
          {formatDate(match.matchedAt)}
        </span>
      </div>

      {/* Buyer info */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        background: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(16px)",
        borderRadius: "16px",
        border: "1px solid rgba(255,255,255,0.12)",
        padding: "16px",
      }}>
        {/* Avatar */}
        <div style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          background: "#FF6B00",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
          fontWeight: 700,
          flexShrink: 0,
          overflow: "hidden",
        }}>
          {match.buyerAvatarUrl ? (
            <img src={match.buyerAvatarUrl} alt={match.buyerName ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ color: "#0D0D0D" }}>{buyerInitials}</span>
          )}
        </div>
        <div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: "16px" }}>
            {match.buyerName ?? "Cliente"}
          </p>
          <p style={{ margin: 0, fontSize: "12px", color: "#9E9080" }}>
            ha hecho match con esta propiedad
          </p>
        </div>
      </div>

      {/* Listing images */}
      {mainImage && (
        <div style={{
          borderRadius: "16px",
          overflow: "hidden",
          height: "220px",
          background: "rgba(255,255,255,0.05)",
        }}>
          <img
            src={mainImage}
            alt={match.listingTitle ?? "Propiedad"}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      )}

      {/* Listing info */}
      <div style={{
        background: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(16px)",
        borderRadius: "16px",
        border: "1px solid rgba(255,255,255,0.12)",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}>
        <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>
          {match.listingTitle ?? "Propiedad sin título"}
        </h1>
        <p style={{ margin: 0, fontSize: "24px", fontWeight: 700, color: "#FF6B00" }}>
          {formatPrice(match.listingPrice)}
        </p>

        {match.listingAddress && (
          <p style={{ margin: 0, fontSize: "14px", color: "#9E9080" }}>
            📍 {match.listingAddress}
            {match.listingCity && `, ${match.listingCity}`}
          </p>
        )}

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {match.listingBedrooms && (
            <span style={{ fontSize: "13px", color: "#C4B8A8" }}>
              🛏️ {match.listingBedrooms} hab.
            </span>
          )}
          {match.listingSizeSqm && (
            <span style={{ fontSize: "13px", color: "#C4B8A8" }}>
              📐 {parseFloat(match.listingSizeSqm).toFixed(0)} m²
            </span>
          )}
        </div>

        {match.listingDescription && (
          <p style={{ margin: 0, fontSize: "13px", color: "#9E9080", lineHeight: "1.6" }}>
            {match.listingDescription.slice(0, 200)}
            {match.listingDescription.length > 200 ? "..." : ""}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* Marcar como gestionado */}
        <button
          id="btn-marcar-gestionado"
          onClick={handleMarcarGestionado}
          disabled={gestionado || loading}
          style={{
            padding: "16px",
            borderRadius: "14px",
            border: "none",
            background: gestionado
              ? "rgba(255,255,255,0.1)"
              : "linear-gradient(135deg, #FF6B00, #FF8C40)",
            color: gestionado ? "#9E9080" : "#0D0D0D",
            fontWeight: 700,
            fontSize: "15px",
            cursor: gestionado ? "default" : "pointer",
            transition: "all 0.2s",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Guardando..." : gestionado ? "✓ Gestionado" : "✓ Marcar como gestionado"}
        </button>

        {/* Ver detalle completo */}
        <Link
          href={`/listings/${match.listingId}`}
          style={{
            display: "block",
            padding: "16px",
            borderRadius: "14px",
            border: "1px solid rgba(255,107,0,0.3)",
            background: "transparent",
            color: "#FF6B00",
            fontWeight: 600,
            fontSize: "15px",
            textAlign: "center",
            textDecoration: "none",
            transition: "all 0.2s",
          }}
        >
          Ver propiedad completa →
        </Link>
      </div>

      {/* Gestionado status */}
      {gestionado && match.confirmedAt && (
        <p style={{ fontSize: "12px", color: "#9E9080", textAlign: "center", margin: 0 }}>
          Gestionado el {formatDate(match.confirmedAt)}
        </p>
      )}
    </main>
  );
}
