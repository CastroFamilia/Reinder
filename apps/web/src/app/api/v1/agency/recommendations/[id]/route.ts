/**
 * apps/web/src/app/api/v1/agency/recommendations/[id]/route.ts
 *
 * PATCH /api/v1/agency/recommendations/:id — Dismiss or accept a recommendation.
 *
 * Story 9.5, AC7
 *
 * Auth: agency_admin only (401/403)
 * Body: { action: 'dismiss' } | { action: 'accept', experimentId: '<uuid>' }
 * 409 when recommendation is not pending.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import { experimentRecommendations } from "@reinder/shared/db/schema";
import { eq } from "drizzle-orm";

// ─── Body validation ─────────────────────────────────────────────────────────

const VALID_ACTIONS = ["dismiss", "accept"] as const;
type ValidAction = (typeof VALID_ACTIONS)[number];

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validates that a string is a valid UUID v4 format */
function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

function validatePatchBody(body: unknown):
  | { valid: true; action: ValidAction; experimentId?: string }
  | { valid: false; message: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, message: "Request body is required" };
  }

  const b = body as Record<string, unknown>;

  if (
    !b.action ||
    typeof b.action !== "string" ||
    !VALID_ACTIONS.includes(b.action as ValidAction)
  ) {
    return {
      valid: false,
      message: `action must be one of: ${VALID_ACTIONS.join(", ")}`,
    };
  }

  if (b.action === "accept") {
    if (
      !b.experimentId ||
      typeof b.experimentId !== "string" ||
      !UUID_REGEX.test(b.experimentId)
    ) {
      return {
        valid: false,
        message:
          "experimentId is required and must be a valid UUID when action is 'accept'",
      };
    }
    return {
      valid: true,
      action: "accept",
      experimentId: b.experimentId,
    };
  }

  return { valid: true, action: b.action as ValidAction };
}

// ─── PATCH handler ───────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = await (params instanceof Promise ? params : Promise.resolve(params));

  // ─── 0. Validate path parameter ─────────────────────────────────────────
  if (!isValidUuid(id)) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "INVALID_INPUT", message: "Invalid recommendation ID format" },
      },
      { status: 400 },
    );
  }

  // ─── 1. Auth check ──────────────────────────────────────────────────────

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "UNAUTHORIZED", message: "No autenticado" },
      },
      { status: 401 },
    );
  }

  // ─── 2. Role check — agency_admin only ──────────────────────────────────

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, agencyId:agency_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "agency_admin" || !profile.agencyId) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "FORBIDDEN", message: "Solo agency_admin" },
      },
      { status: 403 },
    );
  }

  // ─── 3. Parse + validate body ───────────────────────────────────────────

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        data: null,
        error: { code: "INVALID_INPUT", message: "Invalid JSON body" },
      },
      { status: 400 },
    );
  }

  const validation = validatePatchBody(body);
  if (!validation.valid) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "VALIDATION_ERROR", message: validation.message },
      },
      { status: 400 },
    );
  }

  try {
    // ─── 4. Fetch recommendation ────────────────────────────────────────────

    const [recommendation] = await db
      .select()
      .from(experimentRecommendations)
      .where(eq(experimentRecommendations.id, id))
      .limit(1);

    if (!recommendation) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "NOT_FOUND",
            message: "Recommendation not found",
          },
        },
        { status: 404 },
      );
    }

    // ─── 5. Ownership check ─────────────────────────────────────────────────

    if (recommendation.agencyId !== profile.agencyId) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "NOT_FOUND",
            message: "Recommendation not found",
          },
        },
        { status: 404 },
      );
    }

    // ─── 6. Status check — must be pending ──────────────────────────────────

    if (recommendation.status !== "pending") {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "RECOMMENDATION_NOT_PENDING",
            message: `Cannot update recommendation with status '${recommendation.status}'. Only pending recommendations can be dismissed or accepted.`,
          },
        },
        { status: 409 },
      );
    }

    // ─── 7. Apply update ────────────────────────────────────────────────────

    const updateData: Record<string, unknown> = {
      status: validation.action === "dismiss" ? "dismissed" : "accepted",
      updatedAt: new Date(),
    };

    if (
      validation.action === "accept" &&
      "experimentId" in validation
    ) {
      updateData.acceptedExperimentId = validation.experimentId;
    }

    const [updated] = await db
      .update(experimentRecommendations)
      .set(updateData)
      .where(eq(experimentRecommendations.id, id))
      .returning();

    return NextResponse.json({
      data: { recommendation: updated },
      error: null,
    });
  } catch (error) {
    console.error("[recommendations] PATCH failed:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update recommendation",
        },
      },
      { status: 500 },
    );
  }
}
