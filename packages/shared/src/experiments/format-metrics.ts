/**
 * Story 9.3 — Metric formatting utilities.
 *
 * Pure functions for formatting experiment metrics in the dashboard UI.
 * Used by MetricComparisonCard and other dashboard components.
 *
 * Source: story 9-3, AC7, Dev Notes "Formato de Métricas en UI"
 */

/**
 * Formats a metric value for display.
 *
 * @param value - The raw metric value
 * @param format - Display format type
 * @returns Formatted string (e.g., "5.2s", "8.9%")
 */
export function formatMetric(
  value: number,
  format: "seconds" | "percentage" | "rate"
): string {
  switch (format) {
    case "seconds":
      return `${(value / 1000).toFixed(1)}s`; // 5200ms → "5.2s"
    case "percentage":
      return `${(value * 100).toFixed(1)}%`; // 0.089 → "8.9%"
    case "rate":
      return `${(value * 100).toFixed(1)}%`; // 0.045 → "4.5%"
  }
}

/**
 * Formats a percentage delta for display.
 *
 * @param pctChange - The percentage change value
 * @returns Formatted string with sign (e.g., "+17.3%", "-5.2%")
 */
export function formatDelta(pctChange: number): string {
  const sign = pctChange >= 0 ? "+" : "";
  return `${sign}${pctChange.toFixed(1)}%`;
}

/**
 * Formats a delta in percentage points for display.
 * Used for match_rate and reaffirm_rate deltas.
 *
 * @param diff - The raw difference in decimal (e.g., 0.024)
 * @returns Formatted string in pp (e.g., "+2.4pp")
 */
export function formatDeltaPP(diff: number): string {
  const sign = diff >= 0 ? "+" : "";
  return `${sign}${(diff * 100).toFixed(1)}pp`;
}
