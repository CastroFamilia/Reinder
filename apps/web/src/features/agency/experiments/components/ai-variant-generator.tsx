"use client";
/**
 * AiVariantGenerator — AI-powered listing variant generation UI.
 *
 * Story 9.6, AC6/AC7/AC8
 * - Shows "Generar con IA" button for text experiment types
 * - Loading state with spinner during API call (2-10s)
 * - Renders 3 variant cards with label badges after generation
 * - Emits selected variant to parent form via onVariantSelect
 * - Handles errors with inline toast (429, 503, generic)
 */

import { useState } from "react";
import type { AiVariant } from "@reinder/shared/types/ai-variant";

type ExperimentType = "title" | "description" | "title_and_description";

interface AiVariantGeneratorProps {
  listingId: string;
  experimentType: ExperimentType | string;
  onVariantSelect: (variant: { title?: string; description?: string }) => void;
}

export function AiVariantGenerator({
  listingId,
  experimentType,
  onVariantSelect,
}: AiVariantGeneratorProps) {
  const [variants, setVariants] = useState<AiVariant[] | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AC6: Don't render for cover_image
  if (experimentType === "cover_image") {
    return null;
  }

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setVariants(null);
    setSelectedIndex(null);

    try {
      const res = await fetch("/api/v1/experiments/generate-variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error?.message || "Error al generar variantes");
        return;
      }

      setVariants(json.data.variants);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
    if (variants) {
      const v = variants[index];
      onVariantSelect({
        title: experimentType !== "description" ? v.title : undefined,
        description: experimentType !== "title" ? v.description : undefined,
      });
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Generate button */}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={isLoading}
        style={{
          padding: "12px 20px",
          borderRadius: "12px",
          border: "1px solid rgba(255,107,0,0.4)",
          background: isLoading
            ? "rgba(255,107,0,0.15)"
            : "linear-gradient(135deg, rgba(255,107,0,0.2), rgba(255,107,0,0.1))",
          color: "#FF6B00",
          fontSize: "14px",
          fontWeight: 600,
          fontFamily: "'Inter', system-ui, sans-serif",
          cursor: isLoading ? "wait" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          transition: "all 0.2s ease",
        }}
      >
        {isLoading ? (
          <>
            <span
              role="status"
              style={{
                width: "14px",
                height: "14px",
                border: "2px solid rgba(255,107,0,0.3)",
                borderTopColor: "#FF6B00",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                display: "inline-block",
              }}
            />
            Generando variantes...
          </>
        ) : (
          "✨ Generar variantes con IA"
        )}
      </button>

      {/* Error toast */}
      {error && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "12px",
            background: "rgba(139,58,58,0.15)",
            border: "1px solid rgba(139,58,58,0.3)",
            color: "#E57373",
            fontSize: "13px",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          {error}
        </div>
      )}

      {/* Variant cards */}
      {variants && variants.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "12px",
          }}
        >
          {variants.map((variant, index) => {
            const isSelected = selectedIndex === index;
            return (
              <div
                key={index}
                onClick={() => handleSelect(index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleSelect(index);
                }}
                style={{
                  padding: "16px",
                  borderRadius: "16px",
                  border: `2px solid ${isSelected ? "#FF6B00" : "#2E2820"}`,
                  background: isSelected
                    ? "rgba(255,107,0,0.08)"
                    : "#1E1A15",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {/* Label badge */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: "8px",
                      background: "rgba(74,144,217,0.15)",
                      color: "#4A90D9",
                      fontSize: "11px",
                      fontWeight: 600,
                      fontFamily: "'Inter', system-ui, sans-serif",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {variant.label}
                  </span>
                  {isSelected && (
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#FF6B00",
                        fontWeight: 600,
                        fontFamily: "'Inter', system-ui, sans-serif",
                      }}
                    >
                      ✓ Seleccionada
                    </span>
                  )}
                </div>

                {/* Title */}
                {experimentType !== "description" && (
                  <div>
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#9E9080",
                        fontFamily: "'Inter', system-ui, sans-serif",
                        fontWeight: 500,
                      }}
                    >
                      Título
                    </span>
                    <p
                      style={{
                        margin: "4px 0 0",
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#F5F0E8",
                        fontFamily: "'Inter', system-ui, sans-serif",
                        lineHeight: 1.3,
                      }}
                    >
                      {variant.title}
                    </p>
                  </div>
                )}

                {/* Description */}
                {experimentType !== "title" && variant.description && (
                  <div>
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#9E9080",
                        fontFamily: "'Inter', system-ui, sans-serif",
                        fontWeight: 500,
                      }}
                    >
                      Descripción
                    </span>
                    <p
                      style={{
                        margin: "4px 0 0",
                        fontSize: "13px",
                        color: "#C8BEB0",
                        fontFamily: "'Inter', system-ui, sans-serif",
                        lineHeight: 1.4,
                      }}
                    >
                      {variant.description}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
