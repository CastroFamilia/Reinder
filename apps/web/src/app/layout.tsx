import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import { userProfiles } from "@reinder/shared/db/schema";
import { eq } from "drizzle-orm";
import * as Sentry from "@sentry/nextjs";
import { DevRoleSwitcher } from "@/components/dev/DevRoleSwitcher";
import { PostHogProvider } from "@/providers/PostHogProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Reinder — Encuentra tu propiedad ideal",
  description:
    "Reinder es la plataforma para descubrir propiedades exclusivas con tu agente de confianza.",
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

  // Story 7.1 — AC4: Set Sentry user context with role for error tracking
  if (user) {
    Sentry.setUser({ id: user.id, role: role ?? undefined });
  } else {
    Sentry.setUser(null);
  }
  
  const isDev = process.env.NODE_ENV === "development";
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Story 7.1 — AC5: PostHog analytics (GDPR-compliant, EU data residency) */}
        <PostHogProvider>
          {children}
        </PostHogProvider>
        <DevRoleSwitcher initialRole={role} isDev={isDev} />
      </body>
    </html>
  );
}
