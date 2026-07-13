/**
 * apps/web/src/app/(protected)/swipe/page.tsx
 *
 * Stub del feed de swipe — placeholder hasta Epic 2.
 * Se implementará completamente en Story 2.1+.
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Swipe — Reinder",
  description: "Descubre propiedades exclusivas en Reinder.",
};

export default async function SwipePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/register");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(ellipse at center, rgba(255,107,0,0.12) 0%, #0D0D0D 70%)",
        color: "#F5F0E8",
        fontFamily: "system-ui, sans-serif",
        gap: "16px",
      }}
    >
      <div style={{ fontSize: "48px" }}>🏠</div>
      <h1
        style={{
          fontSize: "28px",
          fontWeight: 700,
          color: "#FF6B00",
          margin: 0,
        }}
      >
        Reinder
      </h1>
      <p style={{ color: "#9E9080", margin: 0 }}>
        El feed de propiedades llegará en Epic 2. ¡Cuenta creada correctamente!
      </p>
      <p style={{ color: "#9E9080", fontSize: "13px" }}>
        Sesión activa: {user.email}
      </p>
    </main>
  );
}
