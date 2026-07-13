/**
 * apps/web/src/app/(protected)/agency/experiments/page.tsx
 *
 * Experiments list page — Server Component with agency_admin guard.
 *
 * Story 9.2, AC1/AC2/AC11
 * Guard: only authenticated users with role agency_admin can access.
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import {
  userProfiles,
  listingExperiments,
  listings,
} from "@reinder/shared/db/schema";
import { eq, and, desc } from "drizzle-orm";
import Link from "next/link";
import type { Metadata } from "next";
import { ExperimentList } from "@/features/agency/experiments/components/experiment-list";
import { RecommendationsSection } from "@/features/agency/experiments/components/recommendations-section";

export const metadata: Metadata = {
  title: "Experimentos A/B — Reinder",
  description:
    "Gestiona tus experimentos A/B de portada para optimizar el engagement.",
};

export default async function ExperimentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Verify role — only agency_admin can access
  const [profile] = await db
    .select({ role: userProfiles.role, agencyId: userProfiles.agencyId })
    .from(userProfiles)
    .where(eq(userProfiles.id, user.id))
    .limit(1);

  if (!profile || profile.role !== "agency_admin") {
    // Redirect based on role
    if (profile?.role === "agent") redirect("/agent");
    if (profile?.role === "platform_admin") redirect("/admin");
    redirect("/home");
  }

  if (!profile.agencyId) {
    redirect("/home");
  }

  // Fetch experiments with listing data
  const experiments = await db
    .select({
      id: listingExperiments.id,
      name: listingExperiments.name,
      status: listingExperiments.status,
      experimentType: listingExperiments.experimentType,
      createdAt: listingExperiments.createdAt,
      listingId: listingExperiments.listingId,
      listingTitle: listings.title,
      listingImages: listings.images,
      listingAddress: listings.address,
    })
    .from(listingExperiments)
    .innerJoin(listings, eq(listingExperiments.listingId, listings.id))
    .where(eq(listingExperiments.agencyId, profile.agencyId))
    .orderBy(desc(listingExperiments.createdAt));

  // Serialize for client component
  const serialized = experiments.map((e) => ({
    ...e,
    createdAt: e.createdAt.toISOString(),
    listingImages: (e.listingImages as string[] | null) ?? [],
  }));

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0D0D0D",
        color: "#F5F0E8",
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: "32px 24px",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      {/* Page header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "32px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <Link
            href="/agency/listings"
            style={{
              fontSize: "13px",
              color: "#9E9080",
              textDecoration: "none",
              fontFamily: "'Inter', system-ui, sans-serif",
              marginBottom: "8px",
              display: "inline-block",
            }}
          >
            ← Volver al panel
          </Link>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: 700,
              margin: 0,
              fontFamily: "'Clash Display', system-ui, sans-serif",
              background: "linear-gradient(135deg, #FF6B00, #FF8C00)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            🧪 Experimentos A/B
          </h1>
        </div>

        <Link
          href="/agency/experiments/new"
          id="btn-create-experiment"
          style={{
            padding: "12px 24px",
            borderRadius: "12px",
            background: "#FF6B00",
            color: "#F5F0E8",
            fontSize: "14px",
            fontWeight: 600,
            textDecoration: "none",
            fontFamily: "'Inter', system-ui, sans-serif",
            transition: "transform 0.15s ease",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          ✨ Crear Experimento
        </Link>
      </div>

      {/* Story 9.5, AC8: Proactive recommendations section */}
      <RecommendationsSection />

      <ExperimentList experiments={serialized} />
    </main>
  );
}
