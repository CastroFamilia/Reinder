"use client";
/**
 * ExperimentDetail — Full detail view of a single experiment.
 *
 * Story 9.2, AC6/AC7
 * - Header: name + status badge
 * - Configuration: listing info, experiment type
 * - Variants: side-by-side comparison
 * - Metrics: placeholder
 * - Controls: state transition buttons
 */

import Link from "next/link";
import { ExperimentStatusBadge } from "./experiment-status-badge";
import { VariantComparison } from "./variant-comparison";
import { ExperimentControls } from "./experiment-controls";
import type { ExperimentStatus } from "@reinder/shared/types/experiment";

type ExperimentDetailProps = {
  experiment: {
    id: string;
    name: string;
    status: ExperimentStatus;
    experimentType: string;
    variantA: { coverImageUrl?: string; coverImageIndex?: number };
    variantB: { coverImageUrl?: string; coverImageIndex?: number };
    startedAt: string | null;
    completedAt: string | null;
    createdAt: string;
  };
  listing: {
    id: string;
    title: string;
    address: string | null;
    images: string[] | null;
  } | null;
  results: {
    variant: string;
    impressions: number;
    totalViewTimeMs: number;
    matchCount: number;
    reaffirmCount: number;
  }[];
};

export function ExperimentDetail({
  experiment,
  listing,
  results,
}: ExperimentDetailProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color: "#F5F0E8",
            margin: 0,
            fontFamily: "'Clash Display', system-ui, sans-serif",
          }}
        >
          {experiment.name}
        </h1>
        <ExperimentStatusBadge status={experiment.status} />
      </div>

      {/* Configuration section */}
      <section
        style={{
          background: "#1E1A15",
          borderRadius: "24px",
          border: "1px solid #2E2820",
          padding: "24px",
        }}
      >
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "#F5F0E8",
            margin: "0 0 16px",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          Configuración
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
          }}
        >
          <div>
            <span
              style={{
                display: "block",
                fontSize: "12px",
                color: "#9E9080",
                marginBottom: "4px",
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              Listing asociado
            </span>
            {listing ? (
              <Link
                href={`/agency/listings/${listing.id}`}
                style={{
                  color: "#FF6B00",
                  fontSize: "14px",
                  fontWeight: 500,
                  textDecoration: "none",
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                {listing.title}
                {listing.address ? ` — ${listing.address}` : ""}
              </Link>
            ) : (
              <span
                style={{
                  color: "#9E9080",
                  fontSize: "14px",
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                Listing no encontrado
              </span>
            )}
          </div>
          <div>
            <span
              style={{
                display: "block",
                fontSize: "12px",
                color: "#9E9080",
                marginBottom: "4px",
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              Tipo de experimento
            </span>
            <span
              style={{
                fontSize: "14px",
                color: "#F5F0E8",
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              🖼 Portada A/B
            </span>
          </div>
          <div>
            <span
              style={{
                display: "block",
                fontSize: "12px",
                color: "#9E9080",
                marginBottom: "4px",
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              Creado
            </span>
            <span
              style={{
                fontSize: "14px",
                color: "#F5F0E8",
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              {new Date(experiment.createdAt).toLocaleDateString("es-ES", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          {experiment.startedAt && (
            <div>
              <span
                style={{
                  display: "block",
                  fontSize: "12px",
                  color: "#9E9080",
                  marginBottom: "4px",
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                Iniciado
              </span>
              <span
                style={{
                  fontSize: "14px",
                  color: "#F5F0E8",
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                {new Date(experiment.startedAt).toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Variants section */}
      <section
        style={{
          background: "#1E1A15",
          borderRadius: "24px",
          border: "1px solid #2E2820",
          padding: "24px",
        }}
      >
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "#F5F0E8",
            margin: "0 0 16px",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          Variantes
        </h2>
        <VariantComparison
          variantA={experiment.variantA}
          variantB={experiment.variantB}
        />
      </section>

      {/* Metrics section */}
      <section
        id="metrics-section"
        style={{
          background: "#1E1A15",
          borderRadius: "24px",
          border: "1px solid #2E2820",
          padding: "24px",
        }}
      >
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "#F5F0E8",
            margin: "0 0 16px",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          Métricas
        </h2>
        {experiment.status === "draft" ? (
          <p
            style={{
              color: "#9E9080",
              fontSize: "14px",
              margin: 0,
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Las métricas estarán disponibles cuando el experimento esté en
            ejecución.
          </p>
        ) : results.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
            }}
          >
            {results.map((r) => (
              <div
                key={r.variant}
                style={{
                  padding: "16px",
                  borderRadius: "12px",
                  background: "rgba(158,144,128,0.05)",
                  border: `1px solid ${r.variant === "a" ? "rgba(255,107,0,0.2)" : "rgba(74,144,217,0.2)"}`,
                }}
              >
                <h4
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: r.variant === "a" ? "#FF6B00" : "#4A90D9",
                    margin: "0 0 12px",
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  Variante {r.variant.toUpperCase()}
                </h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                  }}
                >
                  <div>
                    <span
                      style={{
                        display: "block",
                        fontSize: "11px",
                        color: "#9E9080",
                        fontFamily: "'Inter', system-ui, sans-serif",
                      }}
                    >
                      Impresiones
                    </span>
                    <span
                      style={{
                        fontSize: "18px",
                        fontWeight: 700,
                        color: "#F5F0E8",
                        fontFamily: "'Inter', system-ui, sans-serif",
                      }}
                    >
                      {r.impressions}
                    </span>
                  </div>
                  <div>
                    <span
                      style={{
                        display: "block",
                        fontSize: "11px",
                        color: "#9E9080",
                        fontFamily: "'Inter', system-ui, sans-serif",
                      }}
                    >
                      Matches
                    </span>
                    <span
                      style={{
                        fontSize: "18px",
                        fontWeight: 700,
                        color: "#F5F0E8",
                        fontFamily: "'Inter', system-ui, sans-serif",
                      }}
                    >
                      {r.matchCount}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p
            style={{
              color: "#9E9080",
              fontSize: "14px",
              margin: 0,
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Aún no hay métricas registradas.
          </p>
        )}
      </section>

      {/* Controls section */}
      <section
        style={{
          background: "#1E1A15",
          borderRadius: "24px",
          border: "1px solid #2E2820",
          padding: "24px",
        }}
      >
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "#F5F0E8",
            margin: "0 0 16px",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          Controles
        </h2>
        <ExperimentControls
          experimentId={experiment.id}
          status={experiment.status}
        />
        {(experiment.status === "completed" ||
          experiment.status === "cancelled") && (
          <p
            style={{
              color: "#9E9080",
              fontSize: "13px",
              margin: 0,
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Este experimento ha finalizado. No se pueden realizar más cambios.
          </p>
        )}
      </section>
    </div>
  );
}
