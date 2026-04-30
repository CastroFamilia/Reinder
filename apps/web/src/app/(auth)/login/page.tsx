/**
 * apps/web/src/app/(auth)/login/page.tsx
 *
 * Página de login — async Server Component.
 * Lee el searchParam `next` (añadido por el middleware cuando redirige
 * usuarios no autenticados) y lo pasa al LoginForm para:
 *   1. Mostrar el banner "Inicia sesión para continuar"
 *   2. Redirigir de vuelta a la URL original tras login exitoso
 *
 * Story 1.6 — AC: 1, 2
 */
import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Reinder — Iniciar sesión",
  description:
    "Inicia sesión en Reinder para descubrir y hacer match con propiedades.",
};

interface Props {
  searchParams: Promise<{ next?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { next, error } = await searchParams;
  return <LoginForm initialNext={next} initialError={error} />;
}

