/**
 * apps/web/src/app/(protected)/agency/layout.tsx
 *
 * Shared layout for agency pages — includes sidebar navigation.
 *
 * Story 9.2, AC11: navigation includes "Experimentos A/B" link
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panel de Agencia — Reinder",
};

type AgencyLayoutProps = {
  children: React.ReactNode;
};

const NAV_ITEMS = [
  { href: "/agency/listings", label: "Listings", icon: "🏢" },
  { href: "/agency/experiments", label: "Experimentos A/B", icon: "🧪" },
  { href: "/agency/settings/crm", label: "Configuración CRM", icon: "⚙️" },
];

export default function AgencyLayout({ children }: AgencyLayoutProps) {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#0D0D0D",
      }}
    >
      {/* Sidebar navigation */}
      <nav
        id="agency-sidebar"
        style={{
          width: "240px",
          background: "#1E1A15",
          borderRight: "1px solid #2E2820",
          padding: "24px 16px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        {/* Logo / brand */}
        <div
          style={{
            padding: "8px 12px",
            marginBottom: "24px",
          }}
        >
          <span
            style={{
              fontSize: "20px",
              fontWeight: 700,
              fontFamily: "'Clash Display', system-ui, sans-serif",
              background: "linear-gradient(135deg, #FF6B00, #FF8C00)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Reinder
          </span>
          <span
            style={{
              display: "block",
              fontSize: "11px",
              color: "#9E9080",
              marginTop: "2px",
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Panel de Agencia
          </span>
        </div>

        {NAV_ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            id={`nav-${item.href.split("/").pop()}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 12px",
              borderRadius: "10px",
              textDecoration: "none",
              color: "#F5F0E8",
              fontSize: "14px",
              fontWeight: 500,
              fontFamily: "'Inter', system-ui, sans-serif",
              transition: "background 0.15s ease",
            }}
          >
            <span style={{ fontSize: "16px" }}>{item.icon}</span>
            {item.label}
          </a>
        ))}
      </nav>

      {/* Main content */}
      <div style={{ flex: 1, overflow: "auto" }}>{children}</div>
    </div>
  );
}
