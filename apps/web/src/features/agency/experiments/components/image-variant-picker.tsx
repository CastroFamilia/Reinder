"use client";
/**
 * ImageVariantPicker — Visual image grid for selecting Variant B cover photo.
 *
 * Story 9.2, AC4:
 * - Shows all listing images as thumbnails
 * - Image at index 0 marked as "Portada actual (Variante A)" — not selectable
 * - Selected Variant B image gets blue border
 * - Shows warning if listing has only 1 image
 */

type ImageVariantPickerProps = {
  images: string[];
  selectedIndex: number | null;
  onSelect: (index: number, url: string) => void;
  disabled?: boolean;
};

export function ImageVariantPicker({
  images,
  selectedIndex,
  onSelect,
  disabled = false,
}: ImageVariantPickerProps) {
  if (images.length === 0) {
    return (
      <div
        style={{
          padding: "24px",
          background: "#1E1A15",
          borderRadius: "16px",
          border: "1px solid #2E2820",
          textAlign: "center",
          color: "#9E9080",
          fontSize: "14px",
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        Selecciona un listing primero
      </div>
    );
  }

  if (images.length === 1) {
    return (
      <div
        id="single-image-warning"
        style={{
          padding: "16px 20px",
          background: "rgba(255,140,0,0.1)",
          borderRadius: "12px",
          border: "1px solid rgba(255,140,0,0.3)",
          color: "#FF8C00",
          fontSize: "14px",
          fontFamily: "'Inter', system-ui, sans-serif",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span style={{ fontSize: "18px" }}>⚠️</span>
        Este listing solo tiene una imagen. Necesitas al menos 2 imágenes para
        crear un experimento de portada.
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: "12px",
      }}
    >
      {images.map((url, index) => {
        const isCurrentCover = index === 0;
        const isSelected = selectedIndex === index;

        return (
          <button
            key={`img-${index}`}
            id={`image-picker-${index}`}
            type="button"
            disabled={disabled || isCurrentCover}
            onClick={() => !isCurrentCover && onSelect(index, url)}
            style={{
              position: "relative",
              aspectRatio: "4/3",
              borderRadius: "12px",
              overflow: "hidden",
              border: isCurrentCover
                ? "3px solid #FF6B00"
                : isSelected
                  ? "3px solid #4A90D9"
                  : "2px solid #2E2820",
              background: "#1E1A15",
              cursor: isCurrentCover ? "not-allowed" : disabled ? "default" : "pointer",
              padding: 0,
              transition: "all 0.2s ease",
              opacity: isCurrentCover ? 0.7 : 1,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={
                isCurrentCover
                  ? "Portada actual (Variante A)"
                  : `Imagen ${index + 1}`
              }
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />

            {/* Label overlay */}
            <span
              style={{
                position: "absolute",
                bottom: "4px",
                left: "4px",
                right: "4px",
                padding: "4px 8px",
                borderRadius: "6px",
                fontSize: "10px",
                fontWeight: 600,
                fontFamily: "'Inter', system-ui, sans-serif",
                textAlign: "center",
                background: isCurrentCover
                  ? "rgba(255,107,0,0.9)"
                  : isSelected
                    ? "rgba(74,144,217,0.9)"
                    : "transparent",
                color: "#F5F0E8",
                transition: "all 0.2s ease",
              }}
            >
              {isCurrentCover
                ? "Portada actual (A)"
                : isSelected
                  ? "Variante B"
                  : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}
