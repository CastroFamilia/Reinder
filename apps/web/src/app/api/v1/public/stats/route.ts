/**
 * apps/web/src/app/api/v1/public/stats/route.ts
 *
 * Public endpoint: returns aggregate platform statistics
 * for display on the landing page.
 *
 * No authentication required.
 * Story 11.1
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/db";
import { listings, matchEvents, agencies } from "@reinder/shared/db/schema";
import { eq, count } from "drizzle-orm";

export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  try {
    // Count active listings
    const [listingResult] = await db
      .select({ total: count() })
      .from(listings)
      .where(eq(listings.status, "active"));

    // Count total matches
    const [matchResult] = await db
      .select({ total: count() })
      .from(matchEvents);

    // Count active agencies
    const [agencyResult] = await db
      .select({ total: count() })
      .from(agencies)
      .where(eq(agencies.isActive, true));

    return NextResponse.json({
      listingsActive: listingResult?.total ?? 0,
      matchesTotal: matchResult?.total ?? 0,
      agenciesActive: agencyResult?.total ?? 0,
    });
  } catch (error) {
    console.error("Error fetching public stats:", error);
    // Return fallback values instead of erroring
    return NextResponse.json({
      listingsActive: 0,
      matchesTotal: 0,
      agenciesActive: 0,
    });
  }
}
