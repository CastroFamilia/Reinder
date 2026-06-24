/**
 * apps/web/src/app/api/v1/experiments/route.ts
 *
 * POST /api/v1/experiments — Crea un nuevo experimento A/B.
 *
 * Story 9.1, AC6:
 * - Auth: agency_admin requerido (401/403)
 * - Validación del body
 * - Verifica que el listing pertenece a la agencia del usuario
 * - Verifica que no existe otro experimento activo → 409
 * - Auto-pobla variant_a desde el listing actual
 * - Crea 2 filas de experiment_results en transacción
 * - Responde 201
 *
 * Source: story 9-1-schema-experimentos-motor-asignacion-variantes.md (Task 8)
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import {
  listings,
  listingExperiments,
  experimentResults,
} from "@reinder/shared/db/schema";
import { eq, and, inArray } from "drizzle-orm";

// ─── Valid experiment types ──────────────────────────────────────────────────

const VALID_EXPERIMENT_TYPES = [
  "cover_image",
  "title",
  "description",
  "title_and_description",
] as const;

type ExperimentTypeValue = (typeof VALID_EXPERIMENT_TYPES)[number];

// ─── Body validation ─────────────────────────────────────────────────────────

function validateBody(body: unknown): {
  valid: true;
  data: {
    listingId: string;
    name: string;
    experimentType: ExperimentTypeValue;
    variantB: Record<string, unknown>;
  };
} | {
  valid: false;
  message: string;
} {
  if (!body || typeof body !== "object") {
    return { valid: false, message: "Request body is required" };
  }

  const b = body as Record<string, unknown>;

  if (!b.listingId || typeof b.listingId !== "string") {
    return { valid: false, message: "listingId is required and must be a string" };
  }

  if (!b.name || typeof b.name !== "string") {
    return { valid: false, message: "name is required and must be a string" };
  }

  if (!b.experimentType || !VALID_EXPERIMENT_TYPES.includes(b.experimentType as ExperimentTypeValue)) {
    return { valid: false, message: `experimentType must be one of: ${VALID_EXPERIMENT_TYPES.join(", ")}` };
  }

  if (!b.variantB || typeof b.variantB !== "object") {
    return { valid: false, message: "variantB is required and must be an object" };
  }

  return {
    valid: true,
    data: {
      listingId: b.listingId as string,
      name: b.name as string,
      experimentType: b.experimentType as ExperimentTypeValue,
      variantB: b.variantB as Record<string, unknown>,
    },
  };
}

// ─── POST /api/v1/experiments ─────────────────────────────────────────────────

export async function POST(request: Request) {
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

  // ─── 2. Role check — agency_admin only ──────────────────────────────────────

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, agencyId:agency_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "agency_admin") {
    return NextResponse.json(
      {
        data: null,
        error: { code: "FORBIDDEN", message: "Only agency admins can create experiments" },
      },
      { status: 403 }
    );
  }

  // ─── 3. Parse + validate body ───────────────────────────────────────────────

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

  const validation = validateBody(body);
  if (!validation.valid) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: validation.message,
        },
      },
      { status: 400 }
    );
  }

  const { listingId, name, experimentType, variantB } = validation.data;

  // ─── 4–8: DB operations wrapped in try/catch for structured error responses ─

  try {
    // ─── 4. Verify listing belongs to agency ──────────────────────────────────

    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);

    if (!listing || listing.agencyId !== profile.agencyId) {
      return NextResponse.json(
        {
          data: null,
          error: { code: "NOT_FOUND", message: "Listing not found or does not belong to your agency" },
        },
        { status: 404 }
      );
    }

    // ─── 5. Verify no active experiment exists for this listing ────────────────

    const [activeExperiment] = await db
      .select()
      .from(listingExperiments)
      .where(
        and(
          eq(listingExperiments.listingId, listingId),
          inArray(listingExperiments.status, ["draft", "running", "paused"])
        )
      )
      .limit(1);

    if (activeExperiment) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "EXPERIMENT_ALREADY_EXISTS",
            message: "This listing already has an active experiment. Complete or cancel it first.",
          },
        },
        { status: 409 }
      );
    }

    // ─── 6. Auto-populate variant_a from current listing content ──────────────

    const variantA: Record<string, unknown> = {};
    if (experimentType === "cover_image") {
      const images = (listing.images as string[]) ?? [];
      variantA.coverImageUrl = images[0] ?? null;
      variantA.coverImageIndex = 0;
    }
    if (experimentType === "title" || experimentType === "title_and_description") {
      variantA.title = listing.title;
    }
    if (experimentType === "description" || experimentType === "title_and_description") {
      variantA.description = listing.description;
    }

    // ─── 7. Create experiment + result rows in transaction ────────────────────

    const result = await db.transaction(async (tx) => {
      const [experiment] = await tx
        .insert(listingExperiments)
        .values({
          listingId,
          agencyId: listing.agencyId,
          name,
          experimentType,
          variantA,
          variantB,
        })
        .returning();

      // Create 2 experiment_results rows (one per variant, counters at 0)
      await tx.insert(experimentResults).values([
        {
          experimentId: experiment.id,
          variant: "a",
        },
        {
          experimentId: experiment.id,
          variant: "b",
        },
      ]);

      return experiment;
    });

    // ─── 8. Return response ──────────────────────────────────────────────────

    return NextResponse.json(
      {
        data: { experiment: result },
        error: null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[experiments] POST failed:", error);
    return NextResponse.json(
      {
        data: null,
        error: { code: "INTERNAL_ERROR", message: "Failed to create experiment" },
      },
      { status: 500 }
    );
  }
}
