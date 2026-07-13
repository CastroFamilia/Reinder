/**
 * apps/web/src/app/(auth)/terms/page.tsx
 *
 * Página de aceptación de Términos y Condiciones — Server Component.
 * Mostrada a usuarios nuevos que se registraron vía Google OAuth
 * y aún no tienen terms_accepted_at en su user_profile.
 */
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TermsForm } from "./terms-form";

export const metadata: Metadata = {
  title: "Reinder — Términos y Condiciones",
  description: "Acepta los Términos y Condiciones para acceder a Reinder.",
};

export default async function TermsPage() {
  // Verificar que hay sesión activa — si no, redirigir a login
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <TermsForm />;
}
