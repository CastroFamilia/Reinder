/**
 * POST /api/v1/experiments/generate-variants
 *
 * Generates AI-powered listing title/description variants using OpenAI GPT-4o.
 *
 * Story 9.6, AC2/AC3/AC5
 *
 * Auth: agency_admin required (401/403)
 * Rate limit: 10 generations per agency per 24h (429)
 * Ownership: listing must belong to user's agency (404)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import { listings } from "@reinder/shared/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  generateListingVariants,
  AiServiceError,
} from "@/lib/ai/generate-listing-variants";
import { checkRateLimit, recordUsage } from "@/lib/ai/rate-limiter";

// ─── Request validation ──────────────────────────────────────────────────────

const generateVariantsSchema = z.object({
  listingId: z.string().uuid(),
});

// ─── POST Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Authenticate
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "UNAUTHORIZED", message: "Not authenticated" },
      },
      { status: 401 }
    );
  }

  // 2. Verify role
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, agency_id")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "agency_admin" || !profile.agency_id) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "Agency Admin role required",
        },
      },
      { status: 403 }
    );
  }

  // 3. Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        data: null,
        error: { code: "INVALID_INPUT", message: "Invalid JSON body" },
      },
      { status: 400 }
    );
  }

  const parsed = generateVariantsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues?.[0]?.message ?? "Invalid input",
        },
      },
      { status: 400 }
    );
  }

  const { listingId } = parsed.data;

  try {
    // 4. Verify listing ownership
    const [listing] = await db
      .select({
        id: listings.id,
        agencyId: listings.agencyId,
        title: listings.title,
        description: listings.description,
        bedrooms: listings.bedrooms,
        sizeSqm: listings.sizeSqm,
        city: listings.city,
        price: listings.price,
      })
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);

    if (!listing || listing.agencyId !== profile.agency_id) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "LISTING_NOT_FOUND",
            message: "Listing not found or does not belong to your agency",
          },
        },
        { status: 404 }
      );
    }

    // 5. Check rate limit
    const rateLimit = await checkRateLimit(profile.agency_id);
    if (!rateLimit.allowed) {
      const response = NextResponse.json(
        {
          data: null,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message:
              "Límite diario de generaciones alcanzado. Intenta mañana.",
          },
        },
        { status: 429 }
      );
      if (rateLimit.retryAfterSeconds) {
        response.headers.set(
          "Retry-After",
          String(rateLimit.retryAfterSeconds)
        );
      }
      return response;
    }

    // 6. Check API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "AI_NOT_CONFIGURED",
            message: "Generación de variantes no disponible.",
          },
        },
        { status: 503 }
      );
    }

    // 7. Generate variants
    const result = await generateListingVariants({
      title: listing.title,
      description: listing.description,
      bedrooms: listing.bedrooms,
      sizeSqm: listing.sizeSqm,
      city: listing.city,
      price: listing.price,
    });

    // 8. Record usage (post-success, non-fatal — don't lose variants on tracking failure)
    try {
      await recordUsage({
        agencyId: profile.agency_id,
        listingId,
        userId: user.id,
        model: result.usage.model,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
      });
    } catch (usageError) {
      console.error("[ai-variants] Failed to record usage (non-fatal):", usageError);
    }

    // 9. Return variants
    return NextResponse.json({
      data: { variants: result.variants },
      error: null,
    });
  } catch (error) {
    // Handle known AI errors
    if (error instanceof AiServiceError) {
      const statusMap: Record<string, number> = {
        AI_NOT_CONFIGURED: 503,
        AI_PARSE_ERROR: 503,
        CONTENT_SAFETY_FAILED: 422,
      };
      const status = statusMap[error.code] ?? 503;

      console.error(`[ai-variants] AiServiceError: ${error.code}`, error.message);

      return NextResponse.json(
        {
          data: null,
          error: { code: error.code, message: error.message },
        },
        { status }
      );
    }

    // Handle OpenAI SDK / network errors
    console.error("[ai-variants] Unexpected error:", error);

    return NextResponse.json(
      {
        data: null,
        error: {
          code: "AI_SERVICE_UNAVAILABLE",
          message:
            "El servicio de generación no está disponible temporalmente. Intenta en unos minutos.",
        },
      },
      { status: 503 }
    );
  }
}
