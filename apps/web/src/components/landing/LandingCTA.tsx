/**
 * Final CTA section with inline registration form.
 * Story 11.1
 */
import Link from "next/link";

export function LandingCTA() {
  return (
    <section
      style={{
        padding: "120px 24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,107,0,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        className="container"
        style={{
          maxWidth: "640px",
          textAlign: "center",
          position: "relative",
        }}
      >
        <div style={{ fontSize: "48px", marginBottom: "24px" }}>🏠</div>

        <h2
          className="font-display text-h1"
          style={{
            color: "var(--text-primary)",
            marginBottom: "16px",
          }}
        >
          Tu próxima casa te espera
        </h2>

        <p
          className="text-body"
          style={{
            color: "var(--text-muted)",
            marginBottom: "40px",
            fontSize: "17px",
            lineHeight: "1.7",
          }}
        >
          Empieza a descubrir propiedades exclusivas sin esfuerzo. 
          Crea tu cuenta gratuita y haz tu primer match hoy.
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/register"
            className="btn btn-primary btn-lg"
            style={{ minWidth: "220px" }}
          >
            Crear cuenta gratis
          </Link>
          <Link
            href="/login"
            className="btn btn-secondary btn-lg"
          >
            Ya tengo cuenta
          </Link>
        </div>

        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "13px",
            marginTop: "24px",
            opacity: 0.6,
          }}
        >
          Sin tarjeta de crédito · Gratis para compradores · GDPR compliant
        </p>
      </div>
    </section>
  );
}
