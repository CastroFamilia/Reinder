/**
 * ConfidenceIndicator — Sample size and confidence badge.
 *
 * Displays either:
 * - "Datos suficientes" green badge when both variants exceed minSampleSize
 * - "Recopilando datos" yellow badge with progress bar when still collecting
 *
 * Story 9.3, AC8, Task 10
 */
"use client";

import type { ExperimentConfidence } from "@reinder/shared/types/experiment";

type Props = {
  confidence: ExperimentConfidence;
};

export function ConfidenceIndicator({ confidence }: Props) {
  const {
    sampleSufficient,
    minSampleSize,
    currentMinImpressions,
    preliminaryLeader,
    note,
  } = confidence;

  const progress =
    minSampleSize > 0 ? Math.min(currentMinImpressions / minSampleSize, 1) : 0;

  return (
    <div style={styles.container}>
      {/* Badge */}
      <div
        style={{
          ...styles.badge,
          ...(sampleSufficient ? styles.badgeSufficient : styles.badgeCollecting),
        }}
        title={
          sampleSufficient
            ? `Ambas variantes superan el n mínimo de ${minSampleSize}`
            : `Se necesitan al menos ${minSampleSize} impresiones por variante`
        }
      >
        <span style={styles.badgeDot} />
        <span style={styles.badgeText}>
          {sampleSufficient ? "Datos suficientes" : "Recopilando datos"}
        </span>
      </div>

      {/* Progress bar (only when collecting) */}
      {!sampleSufficient && (
        <div style={styles.progressSection}>
          <div style={styles.progressBarOuter}>
            <div
              style={{
                ...styles.progressBarInner,
                width: `${progress * 100}%`,
              }}
            />
          </div>
          <span style={styles.progressText}>
            {currentMinImpressions} / {minSampleSize} impresiones
          </span>
        </div>
      )}

      {/* Preliminary leader */}
      {sampleSufficient && preliminaryLeader && (
        <span style={styles.leaderText}>
          Líder preliminar: Variante {preliminaryLeader.toUpperCase()}
        </span>
      )}

      {/* Note */}
      <p style={styles.note}>{note}</p>
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "16px 20px",
    background: "#1E1A15",
    border: "1px solid #2E2820",
    borderRadius: "16px",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 12px",
    borderRadius: "20px",
    width: "fit-content",
  },
  badgeSufficient: {
    background: "rgba(76, 175, 80, 0.15)",
  },
  badgeCollecting: {
    background: "rgba(255, 140, 0, 0.15)",
  },
  badgeDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "currentColor",
  },
  badgeText: {
    fontFamily: "Inter, sans-serif",
    fontSize: "12px",
    fontWeight: 600,
  },
  progressSection: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  progressBarOuter: {
    flex: 1,
    height: "6px",
    background: "#2E2820",
    borderRadius: "3px",
    overflow: "hidden",
  },
  progressBarInner: {
    height: "100%",
    background: "#FF8C00",
    borderRadius: "3px",
    transition: "width 0.3s ease",
  },
  progressText: {
    fontFamily: "Inter, sans-serif",
    fontSize: "11px",
    color: "#FF8C00",
    whiteSpace: "nowrap" as const,
  },
  leaderText: {
    fontFamily: "Inter, sans-serif",
    fontSize: "12px",
    color: "#9E9080",
  },
  note: {
    fontFamily: "Inter, sans-serif",
    fontSize: "12px",
    color: "#9E9080",
    margin: 0,
  },
};
