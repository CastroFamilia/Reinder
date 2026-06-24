/**
 * ExperimentResultsDashboard — Orchestrator component for experiment results.
 *
 * Fetches data from GET /api/v1/experiments/[id]/results and renders:
 * - MetricComparisonCards (side-by-side A vs B)
 * - ConfidenceIndicator (sample size badge)
 * - TimeseriesChart (line chart with toggle)
 *
 * Auto-refreshes every 60s when experiment is running.
 *
 * Story 9.3, AC7, AC8, AC9, AC10, Task 8
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  ExperimentResultsResponse,
  ExperimentStatus,
} from "@reinder/shared/types/experiment";
import { MetricComparisonCard } from "./metric-comparison-card";
import { ConfidenceIndicator } from "./confidence-indicator";
import { TimeseriesChart } from "./timeseries-chart";

type Props = {
  experimentId: string;
  experimentStatus: ExperimentStatus;
};

export function ExperimentResultsDashboard({
  experimentId,
  experimentStatus,
}: Props) {
  const [results, setResults] =
    useState<ExperimentResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/experiments/${experimentId}/results`);
      const json = await res.json();
      if (res.ok && json.data) {
        setResults(json.data);
        setError(null);
      } else {
        setError(json.error?.message ?? "Failed to load results");
      }
    } catch {
      setError("Network error loading results");
    } finally {
      setLoading(false);
    }
  }, [experimentId]);

  useEffect(() => {
    fetchResults();

    // AC10: Auto-refresh only when experiment is running
    if (experimentStatus === "running") {
      const interval = setInterval(fetchResults, 60_000);
      return () => clearInterval(interval);
    }
  }, [experimentId, experimentStatus, fetchResults]);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Cargando métricas del experimento...</p>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div style={styles.errorContainer}>
        <p style={styles.errorText}>
          {error ?? "No se pudieron cargar los resultados"}
        </p>
        <button onClick={fetchResults} style={styles.retryButton}>
          Reintentar
        </button>
      </div>
    );
  }

  const { a, b } = results.results;
  const { deltas, confidence, baselineMetrics, timeseries } = results;

  return (
    <div style={styles.dashboard}>
      {/* ─── Confidence Indicator ─────────────────────────────────────── */}
      <ConfidenceIndicator confidence={confidence} />

      {/* ─── Comparison Cards ─────────────────────────────────────────── */}
      <div style={styles.cardsGrid}>
        <MetricComparisonCard
          label="Tiempo de Visualización"
          valueA={a.avgViewTimeMs}
          valueB={b.avgViewTimeMs}
          delta={deltas.avgViewTimeMs}
          format="seconds"
          baseline={
            baselineMetrics
              ? baselineMetrics.baselineAvgViewTimeMs
              : undefined
          }
          baselineFormat="seconds"
        />
        <MetricComparisonCard
          label="Tasa de Match"
          valueA={a.matchRate}
          valueB={b.matchRate}
          delta={deltas.matchRate}
          format="percentage"
          baseline={
            baselineMetrics ? baselineMetrics.baselineMatchRate : undefined
          }
          baselineFormat="percentage"
          usePP
        />
        <MetricComparisonCard
          label="Tasa de Reafirmación"
          valueA={a.reaffirmRate}
          valueB={b.reaffirmRate}
          delta={deltas.reaffirmRate}
          format="rate"
          usePP
        />
      </div>

      {/* ─── Timeseries Chart ─────────────────────────────────────────── */}
      <TimeseriesChart
        timeseries={timeseries}
        baselineAvgViewTimeMs={
          baselineMetrics?.baselineAvgViewTimeMs ?? null
        }
        baselineMatchRate={baselineMetrics?.baselineMatchRate ?? null}
        results={results.results}
      />

      {/* ─── Auto-refresh indicator ──────────────────────────────────── */}
      {experimentStatus === "running" && (
        <p style={styles.refreshNote}>
          ↻ Actualizando automáticamente cada 60 segundos
        </p>
      )}
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  dashboard: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    width: "100%",
  },
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "16px",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px",
    gap: "16px",
  },
  spinner: {
    width: "32px",
    height: "32px",
    border: "3px solid #2E2820",
    borderTopColor: "#FF6B00",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: {
    color: "#9E9080",
    fontFamily: "Inter, sans-serif",
    fontSize: "14px",
  },
  errorContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "32px",
    gap: "12px",
    background: "rgba(139, 58, 58, 0.1)",
    borderRadius: "16px",
    border: "1px solid rgba(139, 58, 58, 0.3)",
  },
  errorText: {
    color: "#8B3A3A",
    fontFamily: "Inter, sans-serif",
    fontSize: "14px",
  },
  retryButton: {
    padding: "8px 20px",
    background: "#2E2820",
    color: "#F5F0E8",
    border: "1px solid #3E3830",
    borderRadius: "8px",
    cursor: "pointer",
    fontFamily: "Inter, sans-serif",
    fontSize: "13px",
  },
  refreshNote: {
    color: "#9E9080",
    fontFamily: "Inter, sans-serif",
    fontSize: "12px",
    textAlign: "center" as const,
    margin: "8px 0 0",
  },
};
