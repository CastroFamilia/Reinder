/**
 * apps/web/src/app/api/v1/experiments/[id]/rollback/route.ts
 *
 * POST /api/v1/experiments/:id/rollback — Revert winner promotion (AC8)
 *
 * Auth: agency_admin required, ownership by agency_id
 * State: only valid when status = 'winner_promoted' → 409 otherwise
 * On success: restores listing content to variant_a (original), sets status to 'completed',
 *             creates audit log with promoted_by = 'rollback_agency_admin'
 *
 * Source: story 9-4, AC8, Task 8
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import {
  listings,
  listingExperiments,
  experimentPromotionLogs,
} from "@reinder/shared/db/schema";
import { eq, and } from "drizzle-orm";
import type { VariantContent } from "@reinder/shared/types/experiment";

type RouteParams = { params: Promise<{ id: string }> };

// ─── POST /api/v1/experiments/[id]/rollback ─────────────────────────────────

export async function POST(_request: NextRequest, { params }: RouteParams) {
  // 1. Auth check → 401
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

  // 2. Role check → 403
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, agencyId:agency_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "agency_admin") {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "Only agency admins can rollback experiments",
        },
      },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    // 3. Load experiment + verify ownership via agency_id
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

    // 4. Verify status = 'winner_promoted' → 409 if not
    if (experiment.status !== "winner_promoted") {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "INVALID_STATE_FOR_ROLLBACK",
            message: `Experiment must be in 'winner_promoted' status to rollback. Current status: '${experiment.status}'`,
          },
        },
        { status: 409 }
      );
    }

    // 5. Load listing
    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, experiment.listingId))
      .limit(1);

    if (!listing) {
      return NextResponse.json(
        {
          data: null,
          error: { code: "NOT_FOUND", message: "Listing not found" },
        },
        { status: 404 }
      );
    }

    // 6. Build restore update from variant_a (original content)
    const originalContent = experiment.variantA as VariantContent;
    const listingUpdate: Record<string, unknown> = { updatedAt: new Date() };

    switch (experiment.experimentType) {
      case "cover_image": {
        const images = [...((listing.images as string[]) || [])];
        const originalIndex = originalContent.coverImageIndex ?? 0;
        if (originalIndex > 0 && images.length > originalIndex) {
          const [img] = images.splice(0, 1);
          if (img !== undefined) images.splice(originalIndex, 0, img);
        }
        listingUpdate.images = images;
        break;
      }
      case "title":
        listingUpdate.title = originalContent.title!;
        break;
      case "description":
        listingUpdate.description = originalContent.description!;
        break;
      case "title_and_description":
        listingUpdate.title = originalContent.title!;
        listingUpdate.description = originalContent.description!;
        break;
    }

    // 7. Transaction: restore listing + update status + audit log
    await db.transaction(async (tx) => {
      await tx
        .update(listings)
        .set(listingUpdate)
        .where(eq(listings.id, experiment.listingId));

      await tx
        .update(listingExperiments)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(listingExperiments.id, experiment.id));

      await tx.insert(experimentPromotionLogs).values({
        experimentId: experiment.id,
        listingId: experiment.listingId,
        promotedVariant: "a", // rollback always restores to variant_a
        experimentType: experiment.experimentType,
        previousContent: (experiment.winnerVariant === "a"
          ? experiment.variantA
          : experiment.variantB) as VariantContent,
        promotedContent: originalContent,
        promotedBy: "rollback_agency_admin",
      });
    });

    // 8. Return 200
    return NextResponse.json({
      data: {
        experiment: {
          id: experiment.id,
          status: "completed",
        },
        listing: {
          id: listing.id,
          title:
            (listingUpdate.title as string) ?? listing.title,
          description:
            (listingUpdate.description as string | null) ?? listing.description,
          images:
            (listingUpdate.images as string[]) ?? listing.images,
        },
      },
      error: null,
    });
  } catch (error) {
    console.error("[experiments] POST rollback failed:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to rollback experiment",
        },
      },
      { status: 500 }
    );
  }
}
