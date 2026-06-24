/**
 * MetricComparisonCard — Side-by-side A vs B metric comparison card.
 *
 * Displays a metric value for each variant with delta indicator.
 * Optionally shows baseline reference.
 *
 * Story 9.3, AC7, AC10, Task 9
 */
"use client";

import {
  formatMetric,
  formatDelta,
  formatDeltaPP,
} from "@reinder/shared/experiments/format-metrics";
import type { ExperimentDeltaMetric } from "@reinder/shared/types/experiment";

type MetricFormat = "seconds" | "percentage" | "rate";

type Props = {
  label: string;
  valueA: number;
  valueB: number;
  delta: ExperimentDeltaMetric;
  format: MetricFormat;
  baseline?: number;
  baselineFormat?: MetricFormat;
  usePP?: boolean; // Use percentage points for delta display
};

export function MetricComparisonCard({
  label,
  valueA,
  valueB,
  delta,
  format,
  baseline,
  baselineFormat,
  usePP = false,
}: Props) {
  const formattedA = formatMetric(valueA, format);
  const formattedB = formatMetric(valueB, format);
  const formattedDelta = usePP
    ? formatDeltaPP(delta.diff)
    : formatDelta(delta.pctChange);

  const isPositive = delta.pctChange > 0;
  const isNeutral = delta.pctChange === 0;

  // Calculate baseline deltas per variant
  const baselineA =
    baseline !== undefined && baseline > 0
      ? ((valueA - baseline) / baseline) * 100
      : null;
  const baselineB =
    baseline !== undefined && baseline > 0
      ? ((valueB - baseline) / baseline) * 100
      : null;

  return (
    <div style={styles.card}>
      {/* Card Title */}
      <h4 style={styles.cardTitle}>{label}</h4>

      {/* Comparison Row */}
      <div style={styles.comparisonRow}>
        {/* Variant A */}
        <div style={styles.variantColumn}>
          <span style={styles.variantLabel}>Variante A</span>
          <span style={styles.variantValue}>{formattedA}</span>
          {delta.better === "a" && (
            <span style={{ ...styles.indicator, color: "#4CAF50" }}>▲ Mejor</span>
          )}
          {delta.better === "b" && (
            <span style={{ ...styles.indicator, color: "#8B3A3A" }}>▼</span>
          )}
          {baseline !== undefined && baselineA !== null && (
            <span style={styles.baselineRef}>
              vs baseline: {baselineA >= 0 ? "+" : ""}
              {baselineA.toFixed(1)}%
            </span>
          )}
        </div>

        {/* Delta Center */}
        <div style={styles.deltaColumn}>
          <span
            style={{
              ...styles.deltaValue,
              color: isNeutral
                ? "#9E9080"
                : isPositive
                  ? "#4CAF50"
                  : "#8B3A3A",
            }}
          >
            {formattedDelta}
          </span>
        </div>

        {/* Variant B */}
        <div style={styles.variantColumn}>
          <span style={styles.variantLabel}>Variante B</span>
          <span style={styles.variantValue}>{formattedB}</span>
          {delta.better === "b" && (
            <span style={{ ...styles.indicator, color: "#4CAF50" }}>▲ Mejor</span>
          )}
          {delta.better === "a" && (
            <span style={{ ...styles.indicator, color: "#8B3A3A" }}>▼</span>
          )}
          {baseline !== undefined && baselineB !== null && (
            <span style={styles.baselineRef}>
              vs baseline: {baselineB >= 0 ? "+" : ""}
              {baselineB.toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {/* Baseline Reference */}
      {baseline !== undefined && (
        <div style={styles.baselineRow}>
          <span style={styles.baselineLabel}>
            Baseline: {formatMetric(baseline, baselineFormat ?? format)}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: "#1E1A15",
    border: "1px solid #2E2820",
    borderRadius: "24px",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  cardTitle: {
    fontFamily: "'Clash Display', sans-serif",
    fontSize: "14px",
    fontWeight: 500,
    color: "#9E9080",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    margin: 0,
  },
  comparisonRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  variantColumn: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
  },
  variantLabel: {
    fontFamily: "Inter, sans-serif",
    fontSize: "11px",
    color: "#9E9080",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  variantValue: {
    fontFamily: "'Clash Display', sans-serif",
    fontSize: "28px",
    fontWeight: 600,
    color: "#F5F0E8",
  },
  indicator: {
    fontFamily: "Inter, sans-serif",
    fontSize: "11px",
    fontWeight: 600,
  },
  deltaColumn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 8px",
  },
  deltaValue: {
    fontFamily: "Inter, sans-serif",
    fontSize: "13px",
    fontWeight: 600,
    whiteSpace: "nowrap" as const,
  },
  baselineRow: {
    borderTop: "1px solid #2E2820",
    paddingTop: "12px",
  },
  baselineLabel: {
    fontFamily: "Inter, sans-serif",
    fontSize: "12px",
    color: "#9E9080",
  },
  baselineRef: {
    fontFamily: "Inter, sans-serif",
    fontSize: "10px",
    color: "#9E9080",
    marginTop: "2px",
  },
};
