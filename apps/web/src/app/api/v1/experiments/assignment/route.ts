/**
 * apps/web/src/app/api/v1/experiments/assignment/route.ts
 *
 * GET /api/v1/experiments/assignment?listing_id={uuid}
 * Devuelve la variante asignada al comprador para un experimento activo.
 *
 * Story 9.1, AC5:
 * - Auth: buyer autenticado (401/403)
 * - Si hay experimento running → asigna variante con hash determinístico
 * - Si no hay experimento → { data: null, error: null }
 * - Persiste asignación con fire-and-forget (no bloquea response)
 * - Response time < 50ms (NFR11)
 *
 * Source: story 9-1-schema-experimentos-motor-asignacion-variantes.md (Task 7)
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import {
  listingExperiments,
  experimentAssignments,
} from "@reinder/shared/db/schema";
import { eq, and } from "drizzle-orm";
import { assignVariant } from "@reinder/shared";

// ─── GET /api/v1/experiments/assignment ───────────────────────────────────────

export async function GET(request: Request) {
  // ─── 1. Auth ────────────────────────────────────────────────────────────────

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      },
      { status: 401 }
    );
  }

  // ─── 2. Role check — buyer only ─────────────────────────────────────────────

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "buyer") {
    return NextResponse.json(
      {
        data: null,
        error: { code: "FORBIDDEN", message: "Only buyers can request variant assignments" },
      },
      { status: 403 }
    );
  }

  // ─── 3. Validate query params ───────────────────────────────────────────────

  const { searchParams } = new URL(request.url);
  const listingId = searchParams.get("listing_id");

  if (!listingId) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "INVALID_INPUT", message: "listing_id query param is required" },
      },
      { status: 400 }
    );
  }

  // ─── 4. Find running experiment for this listing ────────────────────────────

  const [experiment] = await db
    .select()
    .from(listingExperiments)
    .where(
      and(
        eq(listingExperiments.listingId, listingId),
        eq(listingExperiments.status, "running")
      )
    )
    .limit(1);

  if (!experiment) {
    return NextResponse.json({ data: null, error: null });
  }

  // ─── 5. Assign variant deterministically ────────────────────────────────────

  const variant = assignVariant(user.id, experiment.id);

  // Select the content for the assigned variant
  const variantContent = variant === "a" ? experiment.variantA : experiment.variantB;

  // ─── 6. Fire-and-forget upsert of assignment ───────────────────────────────

  // Fire-and-forget: async IIFE — don't block the response
  void (async () => {
    try {
      await db
        .insert(experimentAssignments)
        .values({
          experimentId: experiment.id,
          buyerId: user.id,
          variant,
        })
        .onConflictDoNothing();
    } catch (error) {
      console.error("[experiments] assignment upsert failed:", error);
    }
  })();

  // ─── 7. Return response ────────────────────────────────────────────────────

  return NextResponse.json({
    data: {
      experimentId: experiment.id,
      variant,
      variantContent,
    },
    error: null,
  });
}
