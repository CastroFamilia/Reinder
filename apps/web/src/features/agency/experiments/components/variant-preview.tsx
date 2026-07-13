/**
 * VariantPreview — Side-by-side text comparison of Original vs Variant B.
 *
 * Story 9.6, AC9
 * - Left: "Variante A (Original)" with current listing title/description
 * - Right: "Variante B (IA / Editado)" with selected/edited content
 * - Responsive: stacks vertically on mobile
 */

type VariantPreviewProps = {
  originalTitle: string;
  originalDescription: string | null;
  variantBTitle?: string;
  variantBDescription?: string;
  experimentType: "title" | "description" | "title_and_description";
  isEdited?: boolean;
};

export function VariantPreview({
  originalTitle,
  originalDescription,
  variantBTitle,
  variantBDescription,
  experimentType,
  isEdited = false,
}: VariantPreviewProps) {
  const showTitle =
    experimentType === "title" || experimentType === "title_and_description";
  const showDescription =
    experimentType === "description" ||
    experimentType === "title_and_description";

  if (!variantBTitle && !variantBDescription) {
    return null;
  }

  return (
    <div
      id="variant-text-preview"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "16px",
      }}
    >
      {/* Variant A — Original */}
      <div
        style={{
          background: "#1E1A15",
          borderRadius: "16px",
          border: "2px solid #FF6B00",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #2E2820",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#FF6B00",
            }}
          />
          <span
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "#FF6B00",
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Variante A (Original)
          </span>
        </div>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {showTitle && (
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
                {originalTitle}
              </p>
            </div>
          )}
          {showDescription && (
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
                {originalDescription || "Sin descripción"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Variant B — AI / Edited */}
      <div
        style={{
          background: "#1E1A15",
          borderRadius: "16px",
          border: "2px solid #4A90D9",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #2E2820",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#4A90D9",
            }}
          />
          <span
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "#4A90D9",
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Variante B {isEdited ? "(✏️ Editado)" : "(IA)"}
          </span>
        </div>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {showTitle && variantBTitle && (
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
                  background: "rgba(74,144,217,0.08)",
                  padding: "4px 6px",
                  borderRadius: "4px",
                }}
              >
                {variantBTitle}
              </p>
            </div>
          )}
          {showDescription && variantBDescription && (
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
                  background: "rgba(74,144,217,0.08)",
                  padding: "4px 6px",
                  borderRadius: "4px",
                }}
              >
                {variantBDescription}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Responsive: stack vertically on mobile (AC9) */}
      <style>{`
        @media (max-width: 640px) {
          #variant-text-preview {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
