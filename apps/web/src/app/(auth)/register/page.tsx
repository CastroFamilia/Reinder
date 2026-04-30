/**
 * apps/web/src/app/(auth)/register/page.tsx
 *
 * Página de registro — Server Component.
 * Redirige al feed si ya hay sesión activa.
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RegisterForm } from "./register-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crea tu cuenta — Reinder",
  description:
    "Regístrate en Reinder para descubrir propiedades exclusivas que se adaptan a tus preferencias.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const resolvedParams = await searchParams;

  if (user) {
    redirect(resolvedParams.next || "/swipe");
  }

  return <RegisterForm initialNext={resolvedParams.next} />;
}
