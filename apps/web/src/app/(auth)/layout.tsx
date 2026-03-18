/**
 * apps/web/src/app/(auth)/layout.tsx
 *
 * Layout compartido para las páginas de autenticación.
 * Fondo oscuro centrado, sin navbar.
 */
import type { Metadata } from "next";

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
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(ellipse at center, rgba(255,107,0,0.12) 0%, #0D0D0D 70%)",
        padding: "24px",
      }}
    >
      {children}
    </div>
  );
}
