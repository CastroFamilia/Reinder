"use client";
/**
 * ExperimentList — Renders experiment cards with status filter tabs.
 *
 * Story 9.2, AC1 + AC2
 */

import { useState } from "react";
import Link from "next/link";
import { ExperimentStatusBadge } from "./experiment-status-badge";
import type { ExperimentStatus } from "@reinder/shared/types/experiment";

export type ExperimentListItem = {
  id: string;
  name: string;
  status: ExperimentStatus;
  experimentType: string;
  createdAt: string;
  listingId: string;
  listingTitle: string;
  listingImages: string[] | null;
  listingAddress: string | null;
};

const STATUS_FILTERS: { label: string; value: ExperimentStatus | "all" }[] = [
  { label: "Todos", value: "all" },
  { label: "Borrador", value: "draft" },
  { label: "En ejecución", value: "running" },
  { label: "Pausado", value: "paused" },
  { label: "Completado", value: "completed" },
  { label: "Cancelado", value: "cancelled" },
];

type ExperimentListProps = {
  experiments: ExperimentListItem[];
};

export function ExperimentList({ experiments }: ExperimentListProps) {
  const [activeFilter, setActiveFilter] = useState<ExperimentStatus | "all">(
    "all"
  );

  const filtered =
    activeFilter === "all"
      ? experiments
      : experiments.filter((e) => e.status === activeFilter);

  return (
    <div>
      {/* Status filter pills */}
      <div
        id="status-filters"
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "24px",
          flexWrap: "wrap",
        }}
      >
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            id={`filter-${f.value}`}
            type="button"
            onClick={() => setActiveFilter(f.value)}
            style={{
              padding: "8px 16px",
              borderRadius: "20px",
              border:
                activeFilter === f.value
                  ? "1px solid #FF6B00"
                  : "1px solid #2E2820",
              background:
                activeFilter === f.value
                  ? "rgba(255,107,0,0.15)"
                  : "transparent",
              color: activeFilter === f.value ? "#FF6B00" : "#9E9080",
              fontSize: "13px",
              fontWeight: 500,
              fontFamily: "'Inter', system-ui, sans-serif",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Experiments grid */}
      {filtered.length === 0 ? (
        <div
          id="empty-state"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "64px 24px",
            background: "#1E1A15",
            borderRadius: "24px",
            border: "1px solid #2E2820",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🧪</div>
          <h3
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "#F5F0E8",
              margin: "0 0 8px",
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            {activeFilter === "all"
              ? "No hay experimentos todavía"
              : `No hay experimentos ${STATUS_FILTERS.find((f) => f.value === activeFilter)?.label.toLowerCase()}`}
          </h3>
          <p
            style={{
              color: "#9E9080",
              fontSize: "14px",
              margin: "0 0 24px",
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Crea tu primer experimento A/B para descubrir qué portada genera más
            engagement.
          </p>
          {activeFilter === "all" && (
            <Link
              href="/agency/experiments/new"
              id="cta-create-first"
              style={{
                padding: "12px 24px",
                borderRadius: "12px",
                background: "#FF6B00",
                color: "#F5F0E8",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
                fontFamily: "'Inter', system-ui, sans-serif",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
            >
              🧪 Crear primer experimento
            </Link>
          )}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "16px",
            gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
          }}
        >
          {filtered.map((exp) => {
            const thumbnail =
              (exp.listingImages as string[] | null)?.[0] ?? null;

            return (
              <Link
                key={exp.id}
                href={`/agency/experiments/${exp.id}`}
                id={`experiment-card-${exp.id}`}
                style={{
                  display: "block",
                  background: "#1E1A15",
                  borderRadius: "24px",
                  border: "1px solid #2E2820",
                  padding: "20px",
                  textDecoration: "none",
                  transition: "border-color 0.2s ease, transform 0.15s ease",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "16px",
                    alignItems: "flex-start",
                  }}
                >
                  {/* Listing thumbnail */}
                  {thumbnail && (
                    <div
                      style={{
                        width: "64px",
                        height: "64px",
                        borderRadius: "12px",
                        overflow: "hidden",
                        flexShrink: 0,
                        background: "#2E2820",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumbnail}
                        alt={exp.listingTitle}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "8px",
                        marginBottom: "6px",
                      }}
                    >
                      <h3
                        style={{
                          fontSize: "15px",
                          fontWeight: 600,
                          color: "#F5F0E8",
                          margin: 0,
                          fontFamily: "'Inter', system-ui, sans-serif",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {exp.name}
                      </h3>
                      <ExperimentStatusBadge status={exp.status} />
                    </div>

                    <p
                      style={{
                        fontSize: "13px",
                        color: "#9E9080",
                        margin: "0 0 4px",
                        fontFamily: "'Inter', system-ui, sans-serif",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {exp.listingTitle}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: "8px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#9E9080",
                          fontFamily: "'Inter', system-ui, sans-serif",
                          background: "rgba(158,144,128,0.1)",
                          padding: "2px 8px",
                          borderRadius: "8px",
                        }}
                      >
                        Portada A/B
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#9E9080",
                          fontFamily: "'Inter', system-ui, sans-serif",
                        }}
                      >
                        {new Date(exp.createdAt).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
