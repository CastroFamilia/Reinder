/**
 * apps/web/src/components/layout/Footer.tsx
 *
 * Site-wide footer for Reinder web.
 * Story 11.6
 */
import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      style={{
        borderTop: "1px solid var(--border)",
        padding: "48px 24px 32px",
        background: "var(--bg-primary)",
      }}
    >
      <div
        style={{
          maxWidth: "var(--max-width)",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "40px",
        }}
      >
        {/* Brand */}
        <div>
          <div
            style={{
              color: "#FF6B00",
              fontSize: "22px",
              fontWeight: 700,
              letterSpacing: "-0.5px",
              marginBottom: "12px",
              fontFamily: "'Clash Display', 'Inter', system-ui, sans-serif",
            }}
          >
            Reinder
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: "1.6", maxWidth: "280px" }}>
            La primera plataforma inmobiliaria diseñada para el comprador. 
            Swipe. Match. Move.
          </p>
        </div>

        {/* Product */}
        <div>
          <h4
            style={{
              color: "var(--text-primary)",
              fontSize: "13px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "16px",
            }}
          >
            Producto
          </h4>
          <nav style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <FooterLink href="/register">Crear cuenta</FooterLink>
            <FooterLink href="/login">Iniciar sesión</FooterLink>
            <FooterLink href="https://reinder.app" external>App móvil</FooterLink>
          </nav>
        </div>

        {/* Legal */}
        <div>
          <h4
            style={{
              color: "var(--text-primary)",
              fontSize: "13px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "16px",
            }}
          >
            Legal
          </h4>
          <nav style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <FooterLink href="/terms">Términos y Condiciones</FooterLink>
            <FooterLink href="/privacy">Política de Privacidad</FooterLink>
          </nav>
        </div>

        {/* Professional */}
        <div>
          <h4
            style={{
              color: "var(--text-primary)",
              fontSize: "13px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "16px",
            }}
          >
            Profesionales
          </h4>
          <nav style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <FooterLink href="/agent">Acceso agentes</FooterLink>
            <FooterLink href="/agency/listings">Acceso agencias</FooterLink>
          </nav>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          maxWidth: "var(--max-width)",
          margin: "40px auto 0",
          paddingTop: "24px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
          © {currentYear} Reinder. Todos los derechos reservados.
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: "12px" }}>
          Hecho con 🧡 para compradores de verdad
        </p>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  children,
  external = false,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  const style = {
    color: "var(--text-muted)",
    fontSize: "14px",
    textDecoration: "none",
    transition: "color 150ms ease",
  };

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={style}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} style={style}>
      {children}
    </Link>
  );
}
