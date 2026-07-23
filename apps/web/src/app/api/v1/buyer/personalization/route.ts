/**
 * apps/web/src/app/api/v1/buyer/personalization/route.ts
 *
 * PATCH /api/v1/buyer/personalization
 *
 * Story 10.5 — AC2: Toggle personalization on/off for the authenticated buyer.
 *
 * Auth: buyer role only (401 unauthenticated, 403 non-buyer roles).
 *
 * Request body: { enabled: boolean }
 * Response: { data: { personalizationEnabled: boolean, updatedAt: string }, error: null }
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// ─── Input validation schema ─────────────────────────────────────────────────

const PatchBodySchema = z.object({
  enabled: z.boolean(),
});

// ─── PATCH handler ───────────────────────────────────────────────────────────

export async function PATCH(request: Request) {
  // Auth: get session
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      },
      { status: 401 }
    );
  }

  // Auth: verify buyer role
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "buyer") {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "Only buyers can manage personalization settings",
        },
      },
      { status: 403 }
    );
  }

  // Parse request body
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      {
        data: null,
        error: { code: "INVALID_JSON", message: "Invalid JSON body" },
      },
      { status: 400 }
    );
  }

  // Validate input with Zod
  const parseResult = PatchBodySchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "Request body must contain { enabled: boolean }",
        },
      },
      { status: 400 }
    );
  }

  const { enabled } = parseResult.data;
  const now = new Date().toISOString();

  // Update user's personalization setting via Supabase client
  // RLS ensures buyer can only update their own profile (id = auth.uid())
  await supabase
    .from("user_profiles")
    .update({
      personalization_enabled: enabled,
      updated_at: now,
    })
    .eq("id", user.id);

  return NextResponse.json(
    {
      data: {
        personalizationEnabled: enabled,
        updatedAt: now,
      },
      error: null,
    },
    { status: 200 }
  );
}
