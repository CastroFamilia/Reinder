/**
 * apps/web/src/app/page.tsx
 *
 * Landing page — the first impression of Reinder.
 * Public page for non-authenticated visitors.
 * Authenticated users are redirected to /home.
 *
 * Story 11.1
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingStats } from "@/components/landing/LandingStats";
import { LandingCTA } from "@/components/landing/LandingCTA";
import { LandingHowItWorks } from "@/components/landing/LandingHowItWorks";

export const metadata: Metadata = {
  title: "Reinder — Busca casa como scrolleas. Sin esfuerzo.",
  description:
    "La primera plataforma inmobiliaria diseñada para el comprador. Swipe para descubrir propiedades exclusivas, match para guardar, tu agente actúa por ti. Swipe. Match. Move.",
  openGraph: {
    title: "Reinder — Swipe. Match. Move.",
    description:
      "Descubre propiedades exclusivas con un gesto. Tu agente trabaja por ti en tiempo real.",
    type: "website",
    locale: "es_ES",
    siteName: "Reinder",
  },
};

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/home");
  }

  return (
    <>
      <Navbar isAuthenticated={false} />
      <main>
        <LandingHero />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingStats />
        <LandingCTA />
      </main>
      <Footer />
    </>
  );
}
