/**
 * "How it works" section with step-by-step flow.
 * Story 11.1
 */

const steps = [
  {
    number: "01",
    title: "Crea tu cuenta",
    description: "Registro en 30 segundos con email o Google. Acepta los términos y ya estás dentro.",
    icon: "🔑",
  },
  {
    number: "02",
    title: "Abre la app y swipea",
    description: "Propiedades exclusivas a pantalla completa. Swipe derecho si te gusta, izquierdo si no. Así de fácil.",
    icon: "👆",
  },
  {
    number: "03",
    title: "Tus matches, tu historial",
    description: "Cada propiedad que te gusta se guarda automáticamente. Revísalas aquí en la web o desde la app.",
    icon: "💜",
  },
  {
    number: "04",
    title: "Tu agente actúa",
    description: "Tu agente representante recibe cada match al instante y coordina visitas sin que lo pidas.",
    icon: "⚡",
  },
];

export function LandingHowItWorks() {
  return (
    <section
      id="como-funciona"
      style={{
        padding: "120px 24px",
        background: "var(--bg-primary)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle background glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "800px",
          height: "800px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,107,0,0.04) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div className="container" style={{ maxWidth: "var(--max-width)", position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: "72px" }}>
          <h2
            className="font-display text-h1"
            style={{ color: "var(--text-primary)", marginBottom: "16px" }}
          >
            Cómo funciona
          </h2>
          <p
            className="text-body"
            style={{
              color: "var(--text-muted)",
              maxWidth: "480px",
              margin: "0 auto",
              fontSize: "17px",
            }}
          >
            De cero a descubrir tu próxima casa en menos de un minuto.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "32px",
            position: "relative",
          }}
        >
          {steps.map((step, i) => (
            <div
              key={i}
              className="animate-fade-in-up"
              style={{
                opacity: 0,
                animationDelay: `${i * 0.12}s`,
                textAlign: "center",
                position: "relative",
              }}
            >
              {/* Step number */}
              <div
                style={{
                  fontSize: "48px",
                  marginBottom: "16px",
                }}
              >
                {step.icon}
              </div>

              <div
                style={{
                  color: "var(--accent-primary)",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                Paso {step.number}
              </div>

              <h3
                className="text-h3"
                style={{
                  color: "var(--text-primary)",
                  marginBottom: "8px",
                }}
              >
                {step.title}
              </h3>

              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: "15px",
                  lineHeight: "1.6",
                  maxWidth: "260px",
                  margin: "0 auto",
                }}
              >
                {step.description}
              </p>

              {/* Connector line (not on last item) */}
              {i < steps.length - 1 && (
                <div
                  className="step-connector"
                  style={{
                    position: "absolute",
                    top: "36px",
                    right: "-16px",
                    width: "32px",
                    height: "2px",
                    background: "linear-gradient(90deg, rgba(255,107,0,0.3), rgba(255,107,0,0.05))",
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .step-connector { display: none !important; }
        }
      `}</style>
    </section>
  );
}
