/**
 * apps/web/src/app/api/v1/experiments/[id]/route.ts
 *
 * GET   /api/v1/experiments/[id] — Detalle de un experimento (AC10)
 * PATCH /api/v1/experiments/[id] — Transiciones de estado (AC8)
 *
 * Story 9.2
 * Auth: agency_admin requerido, ownership por agency_id
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import {
  listings,
  listingExperiments,
  experimentResults,
} from "@reinder/shared/db/schema";
import { eq, and } from "drizzle-orm";
import {
  updateExperimentStatusSchema,
  isValidTransition,
} from "@/features/agency/experiments/lib/experiment-schemas";

// ─── Shared auth helper ─────────────────────────────────────────────────────

async function authenticateAgencyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json(
        {
          data: null,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        },
        { status: 401 }
      ),
    };
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, agencyId:agency_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "agency_admin") {
    return {
      error: NextResponse.json(
        {
          data: null,
          error: {
            code: "FORBIDDEN",
            message: "Only agency admins can manage experiments",
          },
        },
        { status: 403 }
      ),
    };
  }

  return { user, profile };
}

type RouteParams = { params: Promise<{ id: string }> };

// ─── GET /api/v1/experiments/[id] ─────────────────────────────────────────────

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateAgencyAdmin();
  if ("error" in auth) return auth.error;

  const { profile } = auth;
  const { id } = await params;

  try {
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
      return NextResponse.json(
        {
          data: null,
          error: { code: "NOT_FOUND", message: "Experiment not found" },
        },
        { status: 404 }
      );
    }

    // Fetch listing data
    const [listing] = await db
      .select({
        id: listings.id,
        title: listings.title,
        images: listings.images,
        address: listings.address,
        city: listings.city,
        status: listings.status,
      })
      .from(listings)
      .where(eq(listings.id, experiment.listingId))
      .limit(1);

    // Fetch experiment results
    const results = await db
      .select()
      .from(experimentResults)
      .where(eq(experimentResults.experimentId, id));

    return NextResponse.json({
      data: {
        experiment: {
          id: experiment.id,
          name: experiment.name,
          status: experiment.status,
          experimentType: experiment.experimentType,
          variantA: experiment.variantA,
          variantB: experiment.variantB,
          minSampleSize: experiment.minSampleSize,
          targetPValue: experiment.targetPValue,
          winnerVariant: experiment.winnerVariant,
          startedAt: experiment.startedAt,
          completedAt: experiment.completedAt,
          createdAt: experiment.createdAt,
          updatedAt: experiment.updatedAt,
          listingId: experiment.listingId,
          agencyId: experiment.agencyId,
        },
        listing: listing ?? null,
        results: results.map((r) => ({
          ...r,
          totalViewTimeMs: Number(r.totalViewTimeMs),
        })),
      },
      error: null,
    });
  } catch (error) {
    console.error("[experiments] GET detail failed:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch experiment",
        },
      },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/v1/experiments/[id] ───────────────────────────────────────────

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateAgencyAdmin();
  if ("error" in auth) return auth.error;

  const { profile } = auth;
  const { id } = await params;

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        data: null,
        error: { code: "INVALID_INPUT", message: "Invalid JSON body" },
      },
      { status: 400 }
    );
  }

  // Validate with Zod
  const parsed = updateExperimentStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.errors[0]?.message ?? "Invalid input",
        },
      },
      { status: 400 }
    );
  }

  const { status: newStatus } = parsed.data;

  try {
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
      return NextResponse.json(
        {
          data: null,
          error: { code: "NOT_FOUND", message: "Experiment not found" },
        },
        { status: 404 }
      );
    }

    // Validate state transition
    if (!isValidTransition(experiment.status, newStatus)) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "INVALID_TRANSITION",
            message: `Cannot transition from '${experiment.status}' to '${newStatus}'`,
          },
        },
        { status: 400 }
      );
    }

    // Build update fields
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updatedAt: new Date(),
    };

    // First time transitioning to 'running' → set startedAt
    if (newStatus === "running" && !experiment.startedAt) {
      updateData.startedAt = new Date();
    }

    // Transitioning to 'cancelled' → set completedAt
    if (newStatus === "cancelled") {
      updateData.completedAt = new Date();
    }

    const [updated] = await db
      .update(listingExperiments)
      .set(updateData)
      .where(eq(listingExperiments.id, id))
      .returning();

    return NextResponse.json({
      data: { experiment: updated },
      error: null,
    });
  } catch (error) {
    console.error("[experiments] PATCH status failed:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update experiment status",
        },
      },
      { status: 500 }
    );
  }
}
