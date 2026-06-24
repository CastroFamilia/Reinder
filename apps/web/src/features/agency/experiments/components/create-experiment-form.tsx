"use client";
/**
 * CreateExperimentForm — Full form for creating an A/B cover experiment.
 *
 * Story 9.2, AC3/AC4/AC5
 * - Listing selector dropdown
 * - Experiment name input
 * - Experiment type (fixed: cover_image)
 * - Image variant picker
 * - Submit with POST /api/v1/experiments
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageVariantPicker } from "./image-variant-picker";
import { createExperimentSchema } from "../lib/experiment-schemas";

type ListingOption = {
  id: string;
  title: string;
  address: string | null;
  images: string[];
};

type CreateExperimentFormProps = {
  listings: ListingOption[];
};

export function CreateExperimentForm({ listings }: CreateExperimentFormProps) {
  const router = useRouter();
  const [selectedListingId, setSelectedListingId] = useState<string>("");
  const [name, setName] = useState("");
  const [selectedVariantB, setSelectedVariantB] = useState<{
    coverImageUrl: string;
    coverImageIndex: number;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selectedListing = listings.find((l) => l.id === selectedListingId);
  const listingImages = selectedListing?.images ?? [];
  const hasSingleImage = listingImages.length === 1;
  const canSubmit =
    selectedListingId &&
    name.length >= 3 &&
    name.length <= 100 &&
    selectedVariantB &&
    !hasSingleImage &&
    !isSubmitting;

  const handleListingChange = (listingId: string) => {
    setSelectedListingId(listingId);
    setSelectedVariantB(null); // Reset variant when listing changes
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !selectedVariantB) return;

    const data = {
      listingId: selectedListingId,
      name,
      experimentType: "cover_image" as const,
      variantB: selectedVariantB,
    };

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
          <label
            htmlFor="listing-select"
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 600,
              color: "#F5F0E8",
              marginBottom: "8px",
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Listing
          </label>
          <select
            id="listing-select"
            value={selectedListingId}
            onChange={(e) => handleListingChange(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: "12px",
              border: "1px solid #2E2820",
              background: "#1E1A15",
              color: "#F5F0E8",
              fontSize: "14px",
              fontFamily: "'Inter', system-ui, sans-serif",
              outline: "none",
              cursor: "pointer",
              appearance: "none",
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
          <label
            htmlFor="experiment-name"
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 600,
              color: "#F5F0E8",
              marginBottom: "8px",
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
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
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: "12px",
              border: "1px solid #2E2820",
              background: "#1E1A15",
              color: "#F5F0E8",
              fontSize: "14px",
              fontFamily: "'Inter', system-ui, sans-serif",
              outline: "none",
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
            {name.length}/100
          </span>
        </div>

        {/* Experiment type (fixed) */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 600,
              color: "#F5F0E8",
              marginBottom: "8px",
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Tipo de experimento
          </label>
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "12px",
              border: "1px solid #2E2820",
              background: "#1E1A15",
              color: "#9E9080",
              fontSize: "14px",
              fontFamily: "'Inter', system-ui, sans-serif",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "16px" }}>🖼</span>
            Portada A/B (cover_image)
          </div>
        </div>

        {/* Image variant picker */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 600,
              color: "#F5F0E8",
              marginBottom: "8px",
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Variante B — Foto de portada
          </label>
          <ImageVariantPicker
            images={listingImages}
            selectedIndex={selectedVariantB?.coverImageIndex ?? null}
            onSelect={(index, url) =>
              setSelectedVariantB({ coverImageUrl: url, coverImageIndex: index })
            }
            disabled={!selectedListingId}
          />
        </div>

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
