/**
 * apps/web/src/app/(protected)/agency/listings/page.tsx
 *
 * Stub del panel de gestión de listings de agencia — placeholder hasta Epic 5.
 * Implementación completa en Story 5.1+.
 *
 * Guard: solo usuarios autenticados con rol `agency_admin` pueden acceder.
 * - No autenticado → /login
 * - Autenticado pero rol incorrecto → /swipe
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import { userProfiles } from "@reinder/shared/db/schema";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gestión de Listings — Reinder",
  description: "Panel de gestión de propiedades exclusivas de la agencia.",
};

export default async function AgencyListingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Verificar rol — solo agency_admin puede acceder a esta ruta
  const [profile] = await db
    .select({ role: userProfiles.role })
    .from(userProfiles)
    .where(eq(userProfiles.id, user.id))
    .limit(1);

  if (!profile || profile.role !== "agency_admin") {
    // Buyer, agent o platform_admin no deben acceder a /agency/listings
    redirect("/swipe");
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
        gap: "12px",
      }}
    >
      <div style={{ fontSize: "48px" }}>🏢</div>
      <h1
        style={{
          fontSize: "28px",
          fontWeight: 700,
          color: "#FF6B00",
          margin: 0,
        }}
      >
        Gestión de Listings
      </h1>
      <p style={{ color: "#9E9080", margin: 0 }}>
        Próximamente: tus propiedades exclusivas
      </p>
      <p style={{ color: "#9E9080", fontSize: "13px" }}>
        Sesión activa: {user.email}
      </p>
    </main>
  );
}
