"use client";
/**
 * RecommendationsSection — Proactive experiment recommendations for underperforming listings.
 *
 * Story 9.5, AC8
 *
 * Client component using TanStack Query for data fetching and mutation invalidation.
 * Renders a section above the experiments list with recommendation cards.
 * Shows max 3 cards (aligned with weekly limit).
 * Hidden when no pending recommendations exist.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

// ─── Constants ──────────────────────────────────────────────────────────────

const EXPERIMENT_TYPE_LABELS: Record<string, { icon: string; label: string }> = {
  cover_image: { icon: "📷", label: "Portada A/B" },
  title: { icon: "✏️", label: "Título" },
  description: { icon: "📝", label: "Descripción" },
  title_and_description: { icon: "✏️📝", label: "Título y Descripción" },
};

const MAX_VISIBLE_CARDS = 3;

// ─── Component ──────────────────────────────────────────────────────────────

export function RecommendationsSection() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["agency", "recommendations"],
    queryFn: async () => {
      const res = await fetch("/api/v1/agency/recommendations");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data?.recommendations ?? [];
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/agency/recommendations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss" }),
      });
      if (!res.ok) {
        throw new Error("Failed to dismiss recommendation");
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["agency", "recommendations"],
      }),
  });

  // Don't render section if loading, no data, or no recommendations
  if (isLoading || !data || data.length === 0) return null;

  return (
    <section style={{ marginBottom: "32px" }}>
      <h2
        style={{
          fontSize: "20px",
          fontWeight: 600,
          marginBottom: "16px",
          fontFamily: "'Inter', system-ui, sans-serif",
          color: "#F5F0E8",
        }}
      >
        💡 Recomendaciones
      </h2>
      <div
        style={{
          display: "grid",
          gap: "16px",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        }}
      >
        {data.slice(0, MAX_VISIBLE_CARDS).map((rec: Record<string, unknown>) => {
          const typeInfo =
            EXPERIMENT_TYPE_LABELS[rec.recommendedExperimentType as string] ?? {
              icon: "🔬",
              label: "Experimento",
            };
          const recId = rec.id as string;
          const listingId = rec.listingId as string;
          const recType = rec.recommendedExperimentType as string;

          return (
            <div
              key={recId}
              style={{
                borderRadius: "16px",
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "20px",
                background: "rgba(255,255,255,0.04)",
                backdropFilter: "blur(8px)",
                transition: "transform 0.15s ease, border-color 0.15s ease",
              }}
            >
              {/* Listing thumbnail + title */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "12px",
                }}
              >
                {rec.listingImageUrl && (
                  <img
                    src={rec.listingImageUrl as string}
                    alt=""
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "10px",
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                  />
                )}
                <p
                  style={{
                    fontWeight: 500,
                    fontSize: "14px",
                    color: "#F5F0E8",
                    margin: 0,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  {rec.listingTitle as string}
                </p>
              </div>

              {/* Experiment type badge */}
              <span
                style={{
                  display: "inline-block",
                  padding: "4px 10px",
                  fontSize: "12px",
                  borderRadius: "20px",
                  background: "rgba(255,107,0,0.15)",
                  color: "#FF8C00",
                  fontWeight: 500,
                  marginBottom: "8px",
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                {typeInfo.icon} {typeInfo.label}
              </span>

              {/* Reason detail */}
              <p
                style={{
                  fontSize: "13px",
                  color: "#9E9080",
                  marginBottom: "16px",
                  lineHeight: "1.4",
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                {rec.reasonDetail as string}
              </p>

              {/* Actions */}
              <div style={{ display: "flex", gap: "8px" }}>
                <Link
                  href={`/agency/experiments/new?listingId=${listingId}&type=${recType}&recommendationId=${recId}`}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: "10px 16px",
                    background: "#FF6B00",
                    color: "#F5F0E8",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontWeight: 600,
                    textDecoration: "none",
                    fontFamily: "'Inter', system-ui, sans-serif",
                    transition: "background 0.15s ease",
                  }}
                >
                  Crear Experimento
                </Link>
                <button
                  onClick={() => dismissMutation.mutate(recId)}
                  disabled={dismissMutation.isPending}
                  type="button"
                  style={{
                    padding: "10px 16px",
                    color: "#9E9080",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontFamily: "'Inter', system-ui, sans-serif",
                    cursor: dismissMutation.isPending ? "not-allowed" : "pointer",
                    opacity: dismissMutation.isPending ? 0.5 : 1,
                    background: "transparent",
                    transition: "background 0.15s ease",
                  }}
                >
                  Descartar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
