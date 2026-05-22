/**
 * Landing features section — 3 core value propositions.
 * Story 11.1
 */

const features = [
  {
    icon: "📱",
    title: "Busca en el metro",
    description:
      "Swipe para descubrir propiedades exclusivas en micro-sesiones de 3 minutos. Sin filtros, sin esfuerzo. La búsqueda se convierte en hábito.",
    accent: "rgba(255, 107, 0, 0.1)",
  },
  {
    icon: "🤝",
    title: "Tu agente trabaja por ti",
    description:
      "Vincula a tu agente de confianza con un link. Cada match que hagas le llega en tiempo real — coordina visitas sin que lo pidas.",
    accent: "rgba(74, 222, 128, 0.08)",
  },
  {
    icon: "✅",
    title: "Solo exclusivas verificadas",
    description:
      "Cada propiedad viene directamente del CRM de agencias verificadas. Sin duplicados, sin particulares, sin ruido.",
    accent: "rgba(255, 140, 0, 0.08)",
  },
];

export function LandingFeatures() {
  return (
    <section
      style={{
        padding: "120px 24px",
        background: "var(--bg-primary)",
      }}
    >
      <div
        className="container"
        style={{
          maxWidth: "var(--max-width)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "64px" }}>
          <h2
            className="font-display text-h1"
            style={{ color: "var(--text-primary)", marginBottom: "16px" }}
          >
            ¿Por qué Reinder?
          </h2>
          <p
            className="text-body"
            style={{
              color: "var(--text-muted)",
              maxWidth: "560px",
              margin: "0 auto",
              fontSize: "17px",
            }}
          >
            La primera plataforma inmobiliaria diseñada desde cero para ti, el comprador.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "24px",
          }}
        >
          {features.map((feature, i) => (
            <div
              key={i}
              className="card animate-fade-in-up"
              style={{
                opacity: 0,
                animationDelay: `${i * 0.15}s`,
                padding: "32px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Accent glow */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "2px",
                  background: `linear-gradient(90deg, transparent, ${feature.accent === "rgba(255, 107, 0, 0.1)" ? "#FF6B00" : feature.accent === "rgba(74, 222, 128, 0.08)" ? "#4ADE80" : "#FF8C00"}, transparent)`,
                  opacity: 0.6,
                }}
              />

              <div
                style={{
                  fontSize: "36px",
                  marginBottom: "20px",
                  width: "64px",
                  height: "64px",
                  borderRadius: "16px",
                  background: feature.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {feature.icon}
              </div>

              <h3
                className="text-h3"
                style={{
                  color: "var(--text-primary)",
                  marginBottom: "12px",
                }}
              >
                {feature.title}
              </h3>

              <p
                className="text-body"
                style={{
                  color: "var(--text-muted)",
                  lineHeight: "1.7",
                }}
              >
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
