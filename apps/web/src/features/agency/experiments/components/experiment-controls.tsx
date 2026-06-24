"use client";
/**
 * ExperimentControls — Action buttons for experiment state transitions.
 *
 * Story 9.2, AC7:
 * - draft: "Iniciar" (primary) + "Eliminar Borrador" (danger)
 * - running: "Pausar" (secondary) + "Detener" (danger)
 * - paused: "Reanudar" (primary) + "Detener" (danger)
 * - completed/cancelled: no buttons (read-only)
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ExperimentStatus } from "@reinder/shared/types/experiment";

type ExperimentControlsProps = {
  experimentId: string;
  status: ExperimentStatus;
};

type ActionButton = {
  label: string;
  targetStatus: string;
  variant: "primary" | "secondary" | "danger";
};

const CONTROLS: Record<string, ActionButton[]> = {
  draft: [
    { label: "▶ Iniciar Experimento", targetStatus: "running", variant: "primary" },
    { label: "🗑 Eliminar Borrador", targetStatus: "cancelled", variant: "danger" },
  ],
  running: [
    { label: "⏸ Pausar", targetStatus: "paused", variant: "secondary" },
    { label: "⏹ Detener", targetStatus: "cancelled", variant: "danger" },
  ],
  paused: [
    { label: "▶ Reanudar", targetStatus: "running", variant: "primary" },
    { label: "⏹ Detener", targetStatus: "cancelled", variant: "danger" },
  ],
};

const TOAST_MESSAGES: Record<string, string> = {
  running: "Experimento iniciado — los compradores ahora verán las variantes",
  paused: "Experimento pausado",
  cancelled: "Experimento cancelado",
};

const BUTTON_STYLES: Record<string, React.CSSProperties> = {
  primary: {
    background: "#FF6B00",
    color: "#F5F0E8",
    border: "none",
  },
  secondary: {
    background: "transparent",
    color: "#F5F0E8",
    border: "1px solid #2E2820",
  },
  danger: {
    background: "transparent",
    color: "#8B3A3A",
    border: "1px solid rgba(139,58,58,0.3)",
  },
};

export function ExperimentControls({
  experimentId,
  status,
}: ExperimentControlsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const actions = CONTROLS[status];
  if (!actions || actions.length === 0) return null;

  const handleAction = async (targetStatus: string) => {
    setIsLoading(targetStatus);

    try {
      const res = await fetch(`/api/v1/experiments/${experimentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });

      const json = await res.json();

      if (!res.ok) {
        setToastMessage(json.error?.message || "Error al actualizar");
        setTimeout(() => setToastMessage(null), 4000);
        return;
      }

      // Show success toast
      setToastMessage(TOAST_MESSAGES[targetStatus] || "Estado actualizado");
      setTimeout(() => setToastMessage(null), 4000);

      // Refresh the page to show new status
      router.refresh();
    } catch {
      setToastMessage("Error de conexión");
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <>
      <div
        id="experiment-controls"
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        {actions.map((action) => (
          <button
            key={action.targetStatus}
            id={`btn-${action.targetStatus}`}
            type="button"
            disabled={isLoading !== null}
            onClick={() => handleAction(action.targetStatus)}
            style={{
              ...BUTTON_STYLES[action.variant],
              padding: "12px 24px",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: 600,
              fontFamily: "'Inter', system-ui, sans-serif",
              cursor: isLoading !== null ? "wait" : "pointer",
              transition: "all 0.2s ease",
              opacity: isLoading !== null ? 0.7 : 1,
            }}
          >
            {isLoading === action.targetStatus ? "Actualizando..." : action.label}
          </button>
        ))}
      </div>

      {/* Inline toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            bottom: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(30, 25, 20, 0.95)",
            border: "1px solid rgba(255,107,0,0.3)",
            borderRadius: "12px",
            padding: "12px 20px",
            color: "#F5F0E8",
            fontSize: "14px",
            fontWeight: 500,
            backdropFilter: "blur(12px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            zIndex: 200,
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          {toastMessage}
        </div>
      )}
    </>
  );
}
