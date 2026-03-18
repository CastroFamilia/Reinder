/**
 * apps/web/src/app/(protected)/agent/page.tsx
 *
 * Stub del panel del agente — placeholder hasta Epic 4.
 * Implementación completa en Story 4.1+.
 *
 * Guard: solo usuarios autenticados con rol `agent` pueden acceder.
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
  title: "Panel del Agente — Reinder",
  description: "Panel de gestión de clientes del agente representante.",
};

export default async function AgentDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Verificar rol — solo agents pueden acceder a esta ruta
  const [profile] = await db
    .select({ role: userProfiles.role })
    .from(userProfiles)
    .where(eq(userProfiles.id, user.id))
    .limit(1);

  if (!profile || profile.role !== "agent") {
    // Buyer, agency_admin o platform_admin no deben acceder a /agent
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
      <div style={{ fontSize: "48px" }}>🤝</div>
      <h1
        style={{
          fontSize: "28px",
          fontWeight: 700,
          color: "#FF6B00",
          margin: 0,
        }}
      >
        Panel del Agente
      </h1>
      <p style={{ color: "#9E9080", margin: 0 }}>
        Próximamente: tus clientes vinculados
      </p>
      <p style={{ color: "#9E9080", fontSize: "13px" }}>
        Sesión activa: {user.email}
      </p>
    </main>
  );
}
