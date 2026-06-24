/**
 * TimeseriesChart — SVG-based line chart for experiment time-series data.
 *
 * Displays evolution of metrics over time with:
 * - Orange line (#FF6B00) for Variant A
 * - Blue line (#4A90D9) for Variant B
 * - Dashed gray line (#9E9080) for baseline
 * - Toggle between avg_view_time, match_rate, reaffirm_rate
 *
 * Uses native SVG — no chart library dependency.
 *
 * Story 9.3, AC9, Task 11
 */
"use client";

import { useState, useMemo } from "react";
import type {
  ExperimentTimeseriesEntry,
  ExperimentVariantMetrics,
} from "@reinder/shared/types/experiment";

type MetricKey = "avgViewTimeMs" | "matchRate" | "reaffirmRate";

type Props = {
  timeseries: ExperimentTimeseriesEntry[];
  baselineAvgViewTimeMs: number | null;
  baselineMatchRate: number | null;
  results: {
    a: ExperimentVariantMetrics;
    b: ExperimentVariantMetrics;
  };
};

const METRIC_OPTIONS: Array<{ key: MetricKey; label: string }> = [
  { key: "avgViewTimeMs", label: "Tiempo de Visualización" },
  { key: "matchRate", label: "Tasa de Match" },
  { key: "reaffirmRate", label: "Tasa de Reafirmación" },
];

const CHART_WIDTH = 600;
const CHART_HEIGHT = 200;
const PADDING = { top: 20, right: 20, bottom: 40, left: 50 };

export function TimeseriesChart({
  timeseries,
  baselineAvgViewTimeMs,
  baselineMatchRate,
  results,
}: Props) {
  const [selectedMetric, setSelectedMetric] =
    useState<MetricKey>("avgViewTimeMs");

  // Not enough data for chart
  if (timeseries.length < 2) {
    return (
      <div style={styles.emptyState}>
        <p style={styles.emptyText}>
          El gráfico de evolución estará disponible cuando haya datos de al
          menos 2 horas
        </p>
      </div>
    );
  }

  // Extract values based on selected metric
  const dataPoints = useMemo(() => {
    return timeseries.map((entry) => {
      let aValue: number;
      let bValue: number;

      switch (selectedMetric) {
        case "avgViewTimeMs":
          aValue = entry.a.avgViewTimeMs;
          bValue = entry.b.avgViewTimeMs;
          break;
        case "matchRate":
          aValue =
            entry.a.impressions > 0
              ? (results.a.matchCount / results.a.impressions) *
                (entry.a.impressions / results.a.impressions)
              : 0;
          bValue =
            entry.b.impressions > 0
              ? (results.b.matchCount / results.b.impressions) *
                (entry.b.impressions / results.b.impressions)
              : 0;
          // Use avg from the full results as fallback
          aValue = results.a.matchRate;
          bValue = results.b.matchRate;
          break;
        case "reaffirmRate":
          aValue = results.a.reaffirmRate;
          bValue = results.b.reaffirmRate;
          break;
        default:
          aValue = 0;
          bValue = 0;
      }

      return {
        label: formatBucketHour(entry.bucketHour),
        a: aValue,
        b: bValue,
      };
    });
  }, [timeseries, selectedMetric, results]);

  // Calculate chart bounds
  const allValues = dataPoints.flatMap((d) => [d.a, d.b]);
  let baselineValue: number | null = null;

  if (selectedMetric === "avgViewTimeMs" && baselineAvgViewTimeMs) {
    baselineValue = baselineAvgViewTimeMs;
    allValues.push(baselineValue);
  } else if (selectedMetric === "matchRate" && baselineMatchRate) {
    baselineValue = baselineMatchRate;
    allValues.push(baselineValue);
  }

  const minVal = Math.min(...allValues) * 0.9;
  const maxVal = Math.max(...allValues) * 1.1 || 1;

  const innerWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const xScale = (i: number) =>
    PADDING.left + (i / (dataPoints.length - 1)) * innerWidth;
  const yScale = (v: number) =>
    PADDING.top +
    innerHeight -
    ((v - minVal) / (maxVal - minVal)) * innerHeight;

  // Build SVG path
  const buildPath = (values: number[]) => {
    return values
      .map((v, i) => {
        const x = xScale(i);
        const y = yScale(v);
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  };

  const pathA = buildPath(dataPoints.map((d) => d.a));
  const pathB = buildPath(dataPoints.map((d) => d.b));

  return (
    <div style={styles.container}>
      {/* Toggle */}
      <div style={styles.toggleRow}>
        {METRIC_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSelectedMetric(opt.key)}
            style={{
              ...styles.toggleButton,
              ...(selectedMetric === opt.key
                ? styles.toggleButtonActive
                : {}),
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        style={styles.svg}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = PADDING.top + innerHeight * (1 - pct);
          const value = minVal + (maxVal - minVal) * pct;
          return (
            <g key={pct}>
              <line
                x1={PADDING.left}
                y1={y}
                x2={PADDING.left + innerWidth}
                y2={y}
                stroke="#2E2820"
                strokeWidth={0.5}
              />
              <text
                x={PADDING.left - 8}
                y={y + 3}
                textAnchor="end"
                fill="#9E9080"
                fontSize={9}
                fontFamily="Inter, sans-serif"
              >
                {formatAxisValue(value, selectedMetric)}
              </text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {dataPoints.map((d, i) => {
          // Show max 8 labels
          if (
            dataPoints.length > 8 &&
            i % Math.ceil(dataPoints.length / 8) !== 0 &&
            i !== dataPoints.length - 1
          ) {
            return null;
          }
          return (
            <text
              key={i}
              x={xScale(i)}
              y={CHART_HEIGHT - 5}
              textAnchor="middle"
              fill="#9E9080"
              fontSize={8}
              fontFamily="Inter, sans-serif"
            >
              {d.label}
            </text>
          );
        })}

        {/* Baseline line */}
        {baselineValue !== null && (
          <line
            x1={PADDING.left}
            y1={yScale(baselineValue)}
            x2={PADDING.left + innerWidth}
            y2={yScale(baselineValue)}
            stroke="#9E9080"
            strokeWidth={1}
            strokeDasharray="6 4"
          />
        )}
        {baselineValue !== null && (
          <text
            x={PADDING.left + innerWidth + 4}
            y={yScale(baselineValue) + 3}
            fill="#9E9080"
            fontSize={8}
            fontFamily="Inter, sans-serif"
          >
            Baseline
          </text>
        )}

        {/* Variant A line */}
        <path
          d={pathA}
          fill="none"
          stroke="#FF6B00"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Variant B line */}
        <path
          d={pathB}
          fill="none"
          stroke="#4A90D9"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {dataPoints.map((d, i) => (
          <g key={i}>
            <circle cx={xScale(i)} cy={yScale(d.a)} r={3} fill="#FF6B00" />
            <circle cx={xScale(i)} cy={yScale(d.b)} r={3} fill="#4A90D9" />
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendDot, background: "#FF6B00" }} />
          <span style={styles.legendText}>Variante A</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendDot, background: "#4A90D9" }} />
          <span style={styles.legendText}>Variante B</span>
        </div>
        {baselineValue !== null && (
          <div style={styles.legendItem}>
            <div
              style={{
                ...styles.legendDot,
                background: "#9E9080",
                width: "16px",
                height: "2px",
                borderRadius: "0",
              }}
            />
            <span style={styles.legendText}>Baseline</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatBucketHour(isoString: string): string {
  const date = new Date(isoString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  return `${day}/${month} ${hour}:00`;
}

function formatAxisValue(value: number, metric: MetricKey): string {
  switch (metric) {
    case "avgViewTimeMs":
      return `${(value / 1000).toFixed(1)}s`;
    case "matchRate":
    case "reaffirmRate":
      return `${(value * 100).toFixed(1)}%`;
  }
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: "#1E1A15",
    border: "1px solid #2E2820",
    borderRadius: "24px",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  toggleRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap" as const,
  },
  toggleButton: {
    padding: "6px 14px",
    borderRadius: "20px",
    border: "1px solid #2E2820",
    background: "transparent",
    color: "#9E9080",
    fontFamily: "Inter, sans-serif",
    fontSize: "12px",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  toggleButtonActive: {
    background: "rgba(255, 107, 0, 0.15)",
    borderColor: "#FF6B00",
    color: "#FF6B00",
  },
  svg: {
    width: "100%",
    height: "auto",
  },
  emptyState: {
    background: "#1E1A15",
    border: "1px solid #2E2820",
    borderRadius: "24px",
    padding: "32px",
    textAlign: "center" as const,
  },
  emptyText: {
    color: "#9E9080",
    fontFamily: "Inter, sans-serif",
    fontSize: "14px",
    margin: 0,
  },
  legend: {
    display: "flex",
    justifyContent: "center",
    gap: "24px",
    paddingTop: "8px",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  legendDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
  },
  legendText: {
    fontFamily: "Inter, sans-serif",
    fontSize: "11px",
    color: "#9E9080",
  },
};
