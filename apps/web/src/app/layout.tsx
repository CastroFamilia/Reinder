import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { DevRoleSwitcher } from "@/components/dev/DevRoleSwitcher";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Reinder — Encuentra tu propiedad ideal",
  description:
    "Reinder es la plataforma para descubrir propiedades exclusivas con tu agente de confianza. Swipe. Match. Move.",
  openGraph: {
    title: "Reinder — Descubre propiedades exclusivas",
    description:
      "La búsqueda de tu próxima casa como hábito. Swipe para descubrir, match para guardar, tu agente actúa por ti.",
    type: "website",
    locale: "es_ES",
    siteName: "Reinder",
  },
  twitter: {
    card: "summary_large_image",
    title: "Reinder — Descubre propiedades exclusivas",
    description:
      "La búsqueda de tu próxima casa como hábito. Swipe para descubrir, match para guardar.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let role = null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    try {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      role = profile?.role ?? null;
    } catch (e) {
      console.error("Error fetching user profile in layout:", e);
    }
  }
  
  const isDev = process.env.NODE_ENV === "development";
  return (
    <html lang="es">
      <body className={`${inter.variable} antialiased`}>
        {children}
        <DevRoleSwitcher initialRole={role} isDev={isDev} />
      </body>
    </html>
  );
}
