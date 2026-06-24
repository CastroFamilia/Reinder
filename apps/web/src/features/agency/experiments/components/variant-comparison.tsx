/**
 * VariantComparison — Side-by-side display of Variant A and B images.
 *
 * Story 9.2, AC6: shows both variants with their images in medium size.
 */

type VariantComparisonProps = {
  variantA: { coverImageUrl?: string; coverImageIndex?: number };
  variantB: { coverImageUrl?: string; coverImageIndex?: number };
};

export function VariantComparison({
  variantA,
  variantB,
}: VariantComparisonProps) {
  return (
    <div
      id="variant-comparison"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "16px",
      }}
    >
      {/* Variant A */}
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
            Variante A — Portada actual
          </span>
        </div>
        <div style={{ aspectRatio: "4/3" }}>
          {variantA.coverImageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={variantA.coverImageUrl}
              alt="Variante A"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#9E9080",
                fontSize: "14px",
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              Sin imagen
            </div>
          )}
        </div>
      </div>

      {/* Variant B */}
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
            Variante B — Portada alternativa
          </span>
        </div>
        <div style={{ aspectRatio: "4/3" }}>
          {variantB.coverImageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={variantB.coverImageUrl}
              alt="Variante B"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#9E9080",
                fontSize: "14px",
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              Sin imagen
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
