/**
 * apps/web/src/app/(protected)/swipe/page.tsx
 *
 * La experiencia de swipe es exclusiva de la app móvil.
 * Cualquier usuario que llegue aquí vía web es redirigido al dashboard
 * del comprador en /home.
 */
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Swipe — Reinder",
  description: "Descubre propiedades exclusivas en Reinder.",
};

export default function SwipePage() {
  redirect("/home");
}
