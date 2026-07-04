/**
 * apps/web/src/app/(protected)/agency/experiments/new/page.tsx
 *
 * Create experiment page — Server Component with agency_admin guard.
 * Passes active listings to client-side CreateExperimentForm.
 *
 * Story 9.2, AC3/AC4/AC5
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import { userProfiles, listings } from "@reinder/shared/db/schema";
import { eq, and } from "drizzle-orm";
import Link from "next/link";
import type { Metadata } from "next";
import { CreateExperimentForm } from "@/features/agency/experiments/components/create-experiment-form";

export const metadata: Metadata = {
  title: "Crear Experimento — Reinder",
  description: "Crea un nuevo experimento A/B de portada para tus listings.",
};

export default async function CreateExperimentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [profile] = await db
    .select({ role: userProfiles.role, agencyId: userProfiles.agencyId })
    .from(userProfiles)
    .where(eq(userProfiles.id, user.id))
    .limit(1);

  if (!profile || profile.role !== "agency_admin" || !profile.agencyId) {
    redirect("/home");
  }

  // Fetch active listings for this agency
  const activeListings = await db
    .select({
      id: listings.id,
      title: listings.title,
      address: listings.address,
      images: listings.images,
    })
    .from(listings)
    .where(
      and(
        eq(listings.agencyId, profile.agencyId),
        eq(listings.status, "active")
      )
    );

  const serializedListings = activeListings.map((l) => ({
    id: l.id,
    title: l.title,
    address: l.address,
    images: (l.images as string[] | null) ?? [],
  }));

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0D0D0D",
        color: "#F5F0E8",
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: "32px 24px",
        maxWidth: "720px",
        margin: "0 auto",
      }}
    >
      <Link
        href="/agency/experiments"
        style={{
          fontSize: "13px",
          color: "#9E9080",
          textDecoration: "none",
          fontFamily: "'Inter', system-ui, sans-serif",
          marginBottom: "8px",
          display: "inline-block",
        }}
      >
        ← Volver a Experimentos
      </Link>

      <h1
        style={{
          fontSize: "28px",
          fontWeight: 700,
          margin: "0 0 32px",
          fontFamily: "'Clash Display', system-ui, sans-serif",
          color: "#F5F0E8",
        }}
      >
        Crear Experimento A/B
      </h1>

      {serializedListings.length === 0 ? (
        <div
          style={{
            padding: "48px 24px",
            background: "#1E1A15",
            borderRadius: "24px",
            border: "1px solid #2E2820",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
          <h3
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "#F5F0E8",
              margin: "0 0 8px",
            }}
          >
            No hay listings activos
          </h3>
          <p style={{ color: "#9E9080", fontSize: "14px", margin: 0 }}>
            Necesitas al menos un listing activo para crear un experimento.
          </p>
        </div>
      ) : (
        <div
          style={{
            background: "#1E1A15",
            borderRadius: "24px",
            border: "1px solid #2E2820",
            padding: "32px",
          }}
        >
          <CreateExperimentForm listings={serializedListings} />
        </div>
      )}
    </main>
  );
}
