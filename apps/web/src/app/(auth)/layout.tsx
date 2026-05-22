/**
 * apps/web/src/app/(auth)/layout.tsx
 *
 * Layout for auth pages (login, register, terms).
 * Split-screen design: branding left, form right (desktop).
 * Full-screen with background on mobile.
 * Story 11.2
 */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Reinder — Acceso",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
      }}
    >
      {/* Left panel — branding (desktop only) */}
      <div
        className="auth-branding-panel"
        style={{
          flex: "0 0 45%",
          background:
            "radial-gradient(ellipse at 30% 40%, rgba(255,107,0,0.15) 0%, #0D0D0D 70%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "48px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow orb */}
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "30%",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,107,0,0.08) 0%, transparent 70%)",
            filter: "blur(80px)",
            pointerEvents: "none",
          }}
        />

        <Link
          href="/"
          style={{
            color: "#FF6B00",
            fontSize: "36px",
            fontWeight: 700,
            letterSpacing: "-0.5px",
            textDecoration: "none",
            fontFamily: "'Clash Display', 'Inter', system-ui, sans-serif",
            marginBottom: "24px",
            position: "relative",
          }}
        >
          Reinder
        </Link>

        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "18px",
            textAlign: "center",
            maxWidth: "320px",
            lineHeight: "1.6",
            position: "relative",
          }}
        >
          Busca casa como scrolleas.
          <br />
          <span style={{ color: "#FF6B00" }}>Swipe. Match. Move.</span>
        </p>

        {/* Mockup cards */}
        <div
          style={{
            marginTop: "48px",
            display: "flex",
            gap: "12px",
            position: "relative",
          }}
        >
          {/* Card 1 */}
          <div
            style={{
              width: "120px",
              height: "160px",
              borderRadius: "16px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              transform: "rotate(-6deg)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100px",
                background: "linear-gradient(135deg, rgba(255,107,0,0.1), rgba(255,107,0,0.03))",
              }}
            />
            <div style={{ padding: "8px" }}>
              <div style={{ height: "6px", width: "60%", borderRadius: "3px", background: "var(--border)", marginBottom: "4px" }} />
              <div style={{ height: "4px", width: "40%", borderRadius: "2px", background: "var(--border)" }} />
            </div>
          </div>

          {/* Card 2 */}
          <div
            style={{
              width: "120px",
              height: "160px",
              borderRadius: "16px",
              background: "var(--bg-surface)",
              border: "1px solid rgba(255,107,0,0.2)",
              transform: "rotate(3deg) translateY(-8px)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.4), 0 0 20px rgba(255,107,0,0.08)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100px",
                background: "linear-gradient(135deg, rgba(255,107,0,0.15), rgba(255,107,0,0.05))",
              }}
            />
            <div style={{ padding: "8px" }}>
              <div style={{ height: "6px", width: "70%", borderRadius: "3px", background: "rgba(255,107,0,0.3)", marginBottom: "4px" }} />
              <div style={{ height: "4px", width: "50%", borderRadius: "2px", background: "var(--border)" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-primary)",
          padding: "24px",
        }}
      >
        {children}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .auth-branding-panel { display: none !important; }
        }
      `}</style>
    </div>
  );
}
