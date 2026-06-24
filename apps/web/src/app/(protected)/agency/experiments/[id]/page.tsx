/**
 * apps/web/src/app/(protected)/agency/experiments/[id]/page.tsx
 *
 * Experiment detail page — Server Component with agency_admin guard.
 *
 * Story 9.2, AC6/AC7/AC10
 */
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import {
  userProfiles,
  listingExperiments,
  listings,
  experimentResults,
} from "@reinder/shared/db/schema";
import { eq, and } from "drizzle-orm";
import Link from "next/link";
import type { Metadata } from "next";
import { ExperimentDetail } from "@/features/agency/experiments/components/experiment-detail";

export const metadata: Metadata = {
  title: "Detalle de Experimento — Reinder",
  description: "Vista detallada de tu experimento A/B.",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ExperimentDetailPage({ params }: PageProps) {
  const { id } = await params;

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
    redirect("/swipe");
  }

  // Fetch experiment with ownership check
  const [experiment] = await db
    .select()
    .from(listingExperiments)
    .where(
      and(
        eq(listingExperiments.id, id),
        eq(listingExperiments.agencyId, profile.agencyId)
      )
    )
    .limit(1);

  if (!experiment) {
    notFound();
  }

  // Fetch listing
  const [listing] = await db
    .select({
      id: listings.id,
      title: listings.title,
      address: listings.address,
      images: listings.images,
    })
    .from(listings)
    .where(eq(listings.id, experiment.listingId))
    .limit(1);

  // Fetch results
  const results = await db
    .select()
    .from(experimentResults)
    .where(eq(experimentResults.experimentId, id));

  // Serialize for client
  const serializedExperiment = {
    id: experiment.id,
    name: experiment.name,
    status: experiment.status,
    experimentType: experiment.experimentType,
    variantA: (experiment.variantA as Record<string, unknown>) ?? {},
    variantB: (experiment.variantB as Record<string, unknown>) ?? {},
    startedAt: experiment.startedAt?.toISOString() ?? null,
    completedAt: experiment.completedAt?.toISOString() ?? null,
    createdAt: experiment.createdAt.toISOString(),
  };

  const serializedListing = listing
    ? {
        id: listing.id,
        title: listing.title,
        address: listing.address,
        images: (listing.images as string[] | null) ?? [],
      }
    : null;

  const serializedResults = results.map((r) => ({
    variant: r.variant,
    impressions: r.impressions,
    totalViewTimeMs: Number(r.totalViewTimeMs),
    matchCount: r.matchCount,
    reaffirmCount: r.reaffirmCount,
  }));

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0D0D0D",
        color: "#F5F0E8",
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: "32px 24px",
        maxWidth: "960px",
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
          marginBottom: "16px",
          display: "inline-block",
        }}
      >
        ← Volver a Experimentos
      </Link>

      <ExperimentDetail
        experiment={serializedExperiment}
        listing={serializedListing}
        results={serializedResults}
      />
    </main>
  );
}
