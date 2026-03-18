/**
 * apps/web/src/app/(auth)/login/page.tsx
 *
 * Página de login — Server Component.
 * Renderiza el LoginForm client component.
 */
import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Reinder — Iniciar sesión",
  description:
    "Inicia sesión en Reinder para descubrir y hacer match con propiedades.",
};

export default function LoginPage() {
  return <LoginForm />;
}
