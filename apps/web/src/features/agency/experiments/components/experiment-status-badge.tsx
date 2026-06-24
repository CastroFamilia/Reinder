"use client";
/**
 * ExperimentStatusBadge — Visual badge for experiment status.
 *
 * Story 9.2, AC2: semantic colors per status.
 */

import type { ExperimentStatus } from "@reinder/shared/types/experiment";

const STATUS_COLORS: Record<ExperimentStatus, { bg: string; text: string }> = {
  draft: { bg: "rgba(158,144,128,0.15)", text: "#9E9080" },
  running: { bg: "rgba(76,175,80,0.15)", text: "#4CAF50" },
  paused: { bg: "rgba(255,140,0,0.15)", text: "#FF8C00" },
  completed: { bg: "rgba(74,144,217,0.15)", text: "#4A90D9" },
  cancelled: { bg: "rgba(139,58,58,0.15)", text: "#8B3A3A" },
};

const STATUS_LABELS: Record<ExperimentStatus, string> = {
  draft: "Borrador",
  running: "En ejecución",
  paused: "Pausado",
  completed: "Completado",
  cancelled: "Cancelado",
};

type ExperimentStatusBadgeProps = {
  status: ExperimentStatus;
};

export function ExperimentStatusBadge({ status }: ExperimentStatusBadgeProps) {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.draft;
  const label = STATUS_LABELS[status] ?? status;

  return (
    <span
      id={`status-badge-${status}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 12px",
        borderRadius: "20px",
        fontSize: "12px",
        fontWeight: 600,
        fontFamily: "'Inter', system-ui, sans-serif",
        background: colors.bg,
        color: colors.text,
        textTransform: "capitalize",
        letterSpacing: "0.02em",
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: colors.text,
        }}
      />
      {label}
    </span>
  );
}
