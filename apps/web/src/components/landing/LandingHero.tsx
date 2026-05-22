"use client";

/**
 * Landing hero section with tagline, animated swipe mockup, and CTA.
 * Story 11.1
 */
import Link from "next/link";
import Image from "next/image";

export function LandingHero() {
  return (
    <section
      className="bg-gradient-hero"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "120px 24px 80px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle orange glow orb */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          right: "15%",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,107,0,0.06) 0%, transparent 70%)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      <div
        className="container"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "64px",
          alignItems: "center",
          maxWidth: "var(--max-width)",
        }}
      >
        {/* Left: Copy */}
        <div
          className="animate-fade-in"
          style={{ opacity: 0 }}
        >
          <div
            className="badge badge-new"
            style={{ marginBottom: "24px" }}
          >
            🏠 La búsqueda inmobiliaria reinventada
          </div>

          <h1
            className="font-display text-display"
            style={{
              color: "var(--text-primary)",
              marginBottom: "24px",
              maxWidth: "540px",
            }}
          >
            Busca casa como{" "}
            <span style={{ color: "#FF6B00" }}>scrolleas</span>
          </h1>

          <p
            className="text-body"
            style={{
              color: "var(--text-muted)",
              marginBottom: "40px",
              maxWidth: "460px",
              fontSize: "18px",
              lineHeight: "1.7",
            }}
          >
            Swipe para descubrir propiedades exclusivas. 
            Match para guardar las que te gustan. 
            Tu agente representante actúa por ti en tiempo real.
          </p>

          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <Link
              href="/register"
              className="btn btn-primary btn-lg animate-pulse-glow"
            >
              Empieza gratis →
            </Link>
            <Link
              href="#como-funciona"
              className="btn btn-secondary btn-lg"
            >
              Cómo funciona
            </Link>
          </div>

          {/* Social proof mini */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginTop: "40px",
              opacity: 0.7,
            }}
          >
            <div style={{ display: "flex" }}>
              {["🟠", "🟡", "🟢"].map((dot, i) => (
                <div
                  key={i}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: "rgba(255,107,0,0.15)",
                    border: "2px solid var(--bg-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    marginLeft: i > 0 ? "-10px" : 0,
                  }}
                >
                  {dot}
                </div>
              ))}
            </div>
            <p className="text-small" style={{ color: "var(--text-muted)" }}>
              Compradores descubriendo propiedades ahora mismo
            </p>
          </div>
        </div>

        {/* Right: Animated mockup */}
        <div
          className="animate-fade-in-up delay-200"
          style={{
            opacity: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
          }}
        >
          {/* Phone frame with swipe animation */}
          <div
            style={{
              position: "relative",
              width: "320px",
              height: "580px",
              borderRadius: "40px",
              background: "var(--bg-surface)",
              border: "2px solid var(--border)",
              overflow: "hidden",
              boxShadow: "0 40px 100px rgba(0,0,0,0.5), 0 0 60px rgba(255,107,0,0.08)",
            }}
          >
            {/* Status bar */}
            <div
              style={{
                padding: "12px 24px 8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "rgba(13,13,13,0.8)",
              }}
            >
              <span style={{ color: "#FF6B00", fontWeight: 700, fontSize: "16px" }}>
                Reinder
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                ⚙️
              </span>
            </div>

            {/* Property card mockup */}
            <div
              className="animate-float"
              style={{
                margin: "8px 12px",
                borderRadius: "20px",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <Image
                src="/images/property-card-mockup.png"
                alt="Ejemplo de tarjeta de propiedad en Reinder — Ático en Chamberí por €385,000"
                width={296}
                height={440}
                style={{
                  width: "100%",
                  height: "auto",
                  objectFit: "cover",
                  borderRadius: "20px",
                }}
                priority
              />
            </div>

            {/* Action buttons at bottom */}
            <div
              style={{
                position: "absolute",
                bottom: "16px",
                left: 0,
                right: 0,
                display: "flex",
                justifyContent: "center",
                gap: "24px",
                padding: "0 20px",
              }}
            >
              <ActionButton icon="✕" color="#8B3A3A" label="Rechazar" />
              <ActionButton icon="ⓘ" color="#9E9080" label="Info" />
              <ActionButton icon="♥" color="#FF6B00" label="Match" glow />
            </div>
          </div>

          {/* Floating elements */}
          <div
            className="animate-float delay-300"
            style={{
              position: "absolute",
              top: "40px",
              right: "-20px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "12px 16px",
              boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
            }}
          >
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Nuevo match 🎉</p>
            <p style={{ fontSize: "11px", color: "#FF6B00" }}>Ático en Chamberí</p>
          </div>

          <div
            className="animate-float delay-500"
            style={{
              position: "absolute",
              bottom: "60px",
              left: "-30px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "12px 16px",
              boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
            }}
          >
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Tu agente Elena</p>
            <p style={{ fontSize: "11px", color: "#4ADE80" }}>📞 Visita coordinada</p>
          </div>
        </div>
      </div>

      {/* Responsive override */}
      <style>{`
        @media (max-width: 900px) {
          .container { grid-template-columns: 1fr !important; text-align: center; }
          .container > div:last-child { display: none !important; }
          .text-display { font-size: 36px !important; }
          .container p, .container h1 { max-width: 100% !important; }
          .container > div:first-child { display: flex; flex-direction: column; align-items: center; }
        }
      `}</style>
    </section>
  );
}

function ActionButton({
  icon,
  color,
  label,
  glow = false,
}: {
  icon: string;
  color: string;
  label: string;
  glow?: boolean;
}) {
  return (
    <button
      style={{
        width: "52px",
        height: "52px",
        borderRadius: "50%",
        background: "rgba(30, 26, 21, 0.8)",
        border: `2px solid ${color}40`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "20px",
        cursor: "default",
        boxShadow: glow ? `0 0 20px ${color}40` : "none",
        color,
      }}
      aria-label={label}
      tabIndex={-1}
    >
      {icon}
    </button>
  );
}
