"use client";
/**
 * CreateExperimentForm — Full form for creating A/B experiments.
 *
 * Story 9.2, AC3/AC4/AC5 — cover_image experiments
 * Story 9.6, AC6/AC8/AC10/AC12 — text experiments with AI generation
 *
 * Supports all experiment types:
 * - cover_image: image variant picker (Story 9.2)
 * - title, description, title_and_description: text fields + AI generation (Story 9.6)
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageVariantPicker } from "./image-variant-picker";
import { AiVariantGenerator } from "./ai-variant-generator";
import { VariantPreview } from "./variant-preview";
import { createExperimentSchema } from "../lib/experiment-schemas";
import type { ExperimentType } from "@reinder/shared";

type ListingOption = {
  id: string;
  title: string;
  description: string | null;
  address: string | null;
  images: string[];
};

type CreateExperimentFormProps = {
  listings: ListingOption[];
};

const EXPERIMENT_TYPE_OPTIONS: {
  value: ExperimentType;
  label: string;
  icon: string;
}[] = [
  { value: "cover_image", label: "Portada A/B", icon: "🖼" },
  { value: "title", label: "Título A/B", icon: "✏️" },
  { value: "description", label: "Descripción A/B", icon: "📝" },
  {
    value: "title_and_description",
    label: "Título + Descripción A/B",
    icon: "📋",
  },
];

export function CreateExperimentForm({ listings }: CreateExperimentFormProps) {
  const router = useRouter();
  const [selectedListingId, setSelectedListingId] = useState<string>("");
  const [name, setName] = useState("");
  const [experimentType, setExperimentType] =
    useState<ExperimentType>("cover_image");

  // Cover image variant state (Story 9.2)
  const [selectedCoverVariantB, setSelectedCoverVariantB] = useState<{
    coverImageUrl: string;
    coverImageIndex: number;
  } | null>(null);

  // Text variant state (Story 9.6)
  const [variantBTitle, setVariantBTitle] = useState("");
  const [variantBDescription, setVariantBDescription] = useState("");
  const [isAiGenerated, setIsAiGenerated] = useState(false);
  const [isEdited, setIsEdited] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selectedListing = listings.find((l) => l.id === selectedListingId);
  const listingImages = selectedListing?.images ?? [];
  const hasSingleImage = listingImages.length === 1;
  const isTextType =
    experimentType === "title" ||
    experimentType === "description" ||
    experimentType === "title_and_description";
  const isCoverType = experimentType === "cover_image";

  // Compute canSubmit based on experiment type
  const canSubmitBase =
    selectedListingId && name.length >= 3 && name.length <= 100 && !isSubmitting;

  let canSubmit = false;
  if (canSubmitBase) {
    if (isCoverType) {
      canSubmit = !!selectedCoverVariantB && !hasSingleImage;
    } else if (experimentType === "title") {
      canSubmit = variantBTitle.length > 0;
    } else if (experimentType === "description") {
      canSubmit = variantBDescription.length > 0;
    } else if (experimentType === "title_and_description") {
      canSubmit = variantBTitle.length > 0 && variantBDescription.length > 0;
    }
  }

  const handleListingChange = (listingId: string) => {
    setSelectedListingId(listingId);
    setSelectedCoverVariantB(null);
    // Reset text variants
    setVariantBTitle("");
    setVariantBDescription("");
    setIsAiGenerated(false);
    setIsEdited(false);
  };

  const handleTypeChange = (type: ExperimentType) => {
    setExperimentType(type);
    // Reset variant selections
    setSelectedCoverVariantB(null);
    setVariantBTitle("");
    setVariantBDescription("");
    setIsAiGenerated(false);
    setIsEdited(false);
  };

  const handleAiVariantSelect = (variant: {
    title?: string;
    description?: string;
  }) => {
    if (variant.title !== undefined) setVariantBTitle(variant.title);
    if (variant.description !== undefined)
      setVariantBDescription(variant.description);
    setIsAiGenerated(true);
    setIsEdited(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const data: Record<string, unknown> = {
      listingId: selectedListingId,
      name,
      experimentType,
    };

    if (isCoverType) {
      data.variantB = selectedCoverVariantB;
    } else {
      data.variantB = {
        ...(experimentType !== "description" ? { title: variantBTitle } : {}),
        ...(experimentType !== "title"
          ? { description: variantBDescription }
          : {}),
      };
    }

    // Client-side Zod validation
    const parsed = createExperimentSchema.safeParse(data);
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? "Datos inválidos");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setToastMessage("Este listing ya tiene un experimento activo");
        } else if (res.status === 403) {
          setToastMessage("No tienes permisos para crear experimentos");
        } else {
          setToastMessage(json.error?.message || "Error al crear experimento");
        }
        setTimeout(() => setToastMessage(null), 4000);
        return;
      }

      // Success → redirect to detail
      setToastMessage("Experimento creado en borrador");
      setTimeout(() => {
        router.push(`/agency/experiments/${json.data.experiment.id}`);
      }, 500);
    } catch {
      setToastMessage("Error de conexión");
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const labelStyle = {
    display: "block" as const,
    fontSize: "13px",
    fontWeight: 600,
    color: "#F5F0E8",
    marginBottom: "8px",
    fontFamily: "'Inter', system-ui, sans-serif",
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "12px",
    border: "1px solid #2E2820",
    background: "#1E1A15",
    color: "#F5F0E8",
    fontSize: "14px",
    fontFamily: "'Inter', system-ui, sans-serif",
    outline: "none",
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* Listing selector */}
        <div>
          <label htmlFor="listing-select" style={labelStyle}>
            Listing
          </label>
          <select
            id="listing-select"
            value={selectedListingId}
            onChange={(e) => handleListingChange(e.target.value)}
            style={{
              ...inputStyle,
              cursor: "pointer",
              appearance: "none" as const,
            }}
          >
            <option value="">Selecciona un listing</option>
            {listings.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title} {l.address ? `— ${l.address}` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Experiment name */}
        <div>
          <label htmlFor="experiment-name" style={labelStyle}>
            Nombre del experimento
          </label>
          <input
            id="experiment-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Test portada jardín vs fachada"
            minLength={3}
            maxLength={100}
            required
            style={inputStyle}
          />
          <span
            style={{
              display: "block",
              textAlign: "right",
              fontSize: "11px",
              color: "#9E9080",
              marginTop: "4px",
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            {name.length}/100
          </span>
        </div>

        {/* Experiment type selector */}
        <div>
          <label style={labelStyle}>Tipo de experimento</label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "8px",
            }}
          >
            {EXPERIMENT_TYPE_OPTIONS.map((opt) => {
              const isSelected = experimentType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleTypeChange(opt.value)}
                  style={{
                    padding: "12px 16px",
                    borderRadius: "12px",
                    border: `2px solid ${isSelected ? "#FF6B00" : "#2E2820"}`,
                    background: isSelected
                      ? "rgba(255,107,0,0.08)"
                      : "#1E1A15",
                    color: isSelected ? "#FF6B00" : "#9E9080",
                    fontSize: "13px",
                    fontWeight: isSelected ? 600 : 400,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "all 0.2s ease",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>{opt.icon}</span>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cover image variant picker (Story 9.2) */}
        {isCoverType && (
          <div>
            <label style={labelStyle}>Variante B — Foto de portada</label>
            <ImageVariantPicker
              images={listingImages}
              selectedIndex={selectedCoverVariantB?.coverImageIndex ?? null}
              onSelect={(index, url) =>
                setSelectedCoverVariantB({
                  coverImageUrl: url,
                  coverImageIndex: index,
                })
              }
              disabled={!selectedListingId}
            />
          </div>
        )}

        {/* AI Variant Generator (Story 9.6) — only for text types */}
        {isTextType && selectedListingId && (
          <div>
            <AiVariantGenerator
              listingId={selectedListingId}
              experimentType={experimentType}
              onVariantSelect={handleAiVariantSelect}
            />
          </div>
        )}

        {/* Manual text input fields for Variant B (Story 9.6, AC12) */}
        {isTextType && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {experimentType !== "description" && (
              <div>
                <label htmlFor="variant-b-title" style={labelStyle}>
                  Variante B — Título
                  {isAiGenerated && (
                    <span
                      style={{
                        marginLeft: "8px",
                        fontSize: "11px",
                        color: isEdited ? "#FF6B00" : "#4A90D9",
                        fontWeight: 500,
                      }}
                    >
                      {isEdited ? "✏️ Editado" : "🤖 IA"}
                    </span>
                  )}
                </label>
                <input
                  id="variant-b-title"
                  type="text"
                  value={variantBTitle}
                  onChange={(e) => {
                    setVariantBTitle(e.target.value);
                    if (isAiGenerated) setIsEdited(true);
                  }}
                  placeholder="Escribe o genera con IA"
                  maxLength={120}
                  style={inputStyle}
                />
                <span
                  style={{
                    display: "block",
                    textAlign: "right",
                    fontSize: "11px",
                    color: "#9E9080",
                    marginTop: "4px",
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  {variantBTitle.length}/120
                </span>
              </div>
            )}

            {experimentType !== "title" && (
              <div>
                <label htmlFor="variant-b-description" style={labelStyle}>
                  Variante B — Descripción
                  {isAiGenerated && (
                    <span
                      style={{
                        marginLeft: "8px",
                        fontSize: "11px",
                        color: isEdited ? "#FF6B00" : "#4A90D9",
                        fontWeight: 500,
                      }}
                    >
                      {isEdited ? "✏️ Editado" : "🤖 IA"}
                    </span>
                  )}
                </label>
                <textarea
                  id="variant-b-description"
                  value={variantBDescription}
                  onChange={(e) => {
                    setVariantBDescription(e.target.value);
                    if (isAiGenerated) setIsEdited(true);
                  }}
                  placeholder="Escribe o genera con IA"
                  maxLength={500}
                  rows={4}
                  style={{
                    ...inputStyle,
                    resize: "vertical" as const,
                    minHeight: "100px",
                  }}
                />
                <span
                  style={{
                    display: "block",
                    textAlign: "right",
                    fontSize: "11px",
                    color: "#9E9080",
                    marginTop: "4px",
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  {variantBDescription.length}/500
                </span>
              </div>
            )}
          </div>
        )}

        {/* Variant preview side-by-side (Story 9.6, AC9) */}
        {isTextType &&
          selectedListing &&
          (variantBTitle || variantBDescription) && (
            <VariantPreview
              originalTitle={selectedListing.title}
              originalDescription={selectedListing.description}
              variantBTitle={variantBTitle || undefined}
              variantBDescription={variantBDescription || undefined}
              experimentType={
                experimentType as
                  | "title"
                  | "description"
                  | "title_and_description"
              }
              isEdited={isEdited}
            />
          )}

        {/* Validation error */}
        {error && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "12px",
              background: "rgba(139,58,58,0.15)",
              border: "1px solid rgba(139,58,58,0.3)",
              color: "#8B3A3A",
              fontSize: "13px",
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          id="btn-create-experiment"
          type="submit"
          disabled={!canSubmit}
          style={{
            padding: "14px 28px",
            borderRadius: "12px",
            border: "none",
            background: canSubmit ? "#FF6B00" : "rgba(255,107,0,0.3)",
            color: canSubmit ? "#F5F0E8" : "#9E9080",
            fontSize: "15px",
            fontWeight: 600,
            fontFamily: "'Inter', system-ui, sans-serif",
            cursor: canSubmit ? "pointer" : "not-allowed",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          {isSubmitting ? (
            <>
              <span
                style={{
                  width: "16px",
                  height: "16px",
                  border: "2px solid rgba(245,240,232,0.3)",
                  borderTopColor: "#F5F0E8",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              Creando...
            </>
          ) : (
            "🧪 Crear Experimento"
          )}
        </button>
      </form>

      {/* Toast */}
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

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
