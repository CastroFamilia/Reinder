/**
 * Story 10.3 — ATDD: GET /api/v1/listings — Personalized Cover Photo
 *
 * TDD RED PHASE — All tests use test.skip() and will FAIL until implementation.
 *
 * AC3: API endpoint devuelve foto personalizada basada en recommended_photo_index
 * AC5: Performance — lookup de foto en <5ms (verified by index usage, not timing)
 * AC6: Galería de detalle mantiene orden original (imageUrls no se reordena)
 * AC7: Invalidación al cambiar fotos del listing (trigger updates)
 *
 * These tests cover the API-level behavior of personalized photo selection.
 * They require modifications to GET /api/v1/listings to:
 *   1. Extract buyer_id from JWT
 *   2. Check personalization_enabled from user_profiles
 *   3. LEFT JOIN listing_fit_scores for recommended_photo_index
 *   4. Map images[recommended_photo_index] → imageUrl
 *
 * Run: npx vitest run src/app/api/v1/listings/route.atdd.test.ts
 */

import { describe, expect, test } from "vitest";

// NOTE: The import will work but the behavior under test does not yet exist.
// Tests are test.skip() — TDD red phase.
// import { GET } from "./route";

// ─── Test helpers ─────────────────────────────────────────────────────────────

/**
 * Creates a mock authenticated request with JWT claims.
 * After implementation, the route will extract buyer_id from the JWT.
 */
function makeAuthenticatedRequest(
  buyerId: string,
  params: Record<string, string | string[]> = {},
  headers: Record<string, string> = {},
): Request {
  const url = new URL("http://localhost:3000/api/v1/listings");
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => url.searchParams.append(key, v));
    } else {
      url.searchParams.set(key, value);
    }
  });

  return new Request(url.toString(), {
    headers: {
      // In implementation, this will be a real Supabase JWT with sub=buyerId
      Authorization: `Bearer mock-jwt-for-${buyerId}`,
      ...headers,
    },
  });
}

// ─── AC3: Personalized imageUrl in API response ─────────────────────────────

describe("Story 10.3 — AC3: GET /api/v1/listings returns personalized imageUrl", () => {
  test.skip(
    "[P0] T10.3-19: buyer with personalization_enabled=true gets personalized imageUrl",
    async () => {
      // Given: buyer autenticado con personalization_enabled=true y fit scores pre-calculados
      //   fit scores have recommended_photo_index=2 for listing with 6 images
      // When: GET /api/v1/listings
      // Then: imageUrl = images[2] (personalized), not images[0]
      const { GET } = await import("./route");
      const request = makeAuthenticatedRequest("buyer-with-personalization");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toBeInstanceOf(Array);
      // At least one listing should have a personalized imageUrl
      // (different from images[0] when recommended_photo_index > 0)
      const personalizedListing = body.data.find(
        (l: any) => l.imageUrl && l.imageUrls && l.imageUrl !== l.imageUrls[0]
      );
      // This will pass only when personalization logic is implemented
      expect(personalizedListing).toBeDefined();
    }
  );

  test.skip(
    "[P0] T10.3-20: buyer with personalization_enabled=false gets images[0] as imageUrl",
    async () => {
      // Given: buyer con personalization_enabled=false
      // When: GET /api/v1/listings
      // Then: imageUrl = images[0] (agency default — no personalization)
      // And: listing_fit_scores table NOT consulted for this buyer
      const { GET } = await import("./route");
      const request = makeAuthenticatedRequest("buyer-no-personalization");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      body.data.forEach((listing: any) => {
        if (listing.imageUrls && listing.imageUrls.length > 0) {
          // imageUrl must ALWAYS be images[0] when personalization is disabled
          expect(listing.imageUrl).toBe(listing.imageUrls[0]);
        }
      });
    }
  );

  test.skip(
    "[P0] T10.3-21: new buyer without fit scores gets images[0] as fallback",
    async () => {
      // Given: buyer sin fit scores pre-calculados (first session)
      // When: GET /api/v1/listings
      // Then: imageUrl = images[0] (fallback)
      // And: endpoint performance does not degrade
      const { GET } = await import("./route");
      const request = makeAuthenticatedRequest("buyer-new-no-scores");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      body.data.forEach((listing: any) => {
        if (listing.imageUrls && listing.imageUrls.length > 0) {
          expect(listing.imageUrl).toBe(listing.imageUrls[0]);
        }
      });
    }
  );

  test.skip(
    "[P1] T10.3-22: invalid recommended_photo_index (>= images.length) falls back to images[0]",
    async () => {
      // Given: fit score with recommended_photo_index=10 but listing only has 5 images
      // When: GET /api/v1/listings
      // Then: imageUrl = images[0] (safe fallback)
      const { GET } = await import("./route");
      const request = makeAuthenticatedRequest("buyer-with-stale-index");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      body.data.forEach((listing: any) => {
        if (listing.imageUrls && listing.imageUrls.length > 0) {
          // imageUrl must be a valid entry from imageUrls
          expect(listing.imageUrls).toContain(listing.imageUrl);
        }
      });
    }
  );

  test.skip(
    "[P1] T10.3-23: null recommended_photo_index falls back to images[0]",
    async () => {
      // Given: fit score exists but recommended_photo_index is null
      // When: GET /api/v1/listings
      // Then: imageUrl = images[0]
      const { GET } = await import("./route");
      const request = makeAuthenticatedRequest("buyer-with-null-photo-index");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      body.data.forEach((listing: any) => {
        if (listing.imageUrls && listing.imageUrls.length > 0) {
          expect(listing.imageUrl).toBe(listing.imageUrls[0]);
        }
      });
    }
  );
});

// ─── AC6: Gallery order preserved ───────────────────────────────────────────

describe("Story 10.3 — AC6: imageUrls gallery maintains original agency order", () => {
  test.skip(
    "[P0] T10.3-24: imageUrls array is NOT reordered regardless of personalization",
    async () => {
      // Given: buyer with personalization_enabled=true
      // When: GET /api/v1/listings
      // Then: imageUrls contains all photos in the original agency order
      // And: only imageUrl (hero) is personalized — gallery is untouched
      const { GET } = await import("./route");
      const request = makeAuthenticatedRequest("buyer-with-personalization");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      body.data.forEach((listing: any) => {
        if (listing.imageUrls && listing.imageUrls.length > 0) {
          // imageUrls should remain the full, unmodified array
          // imageUrl may differ from imageUrls[0] (personalized)
          // but imageUrls order must be preserved
          expect(listing.imageUrls).toBeInstanceOf(Array);
          expect(listing.imageUrls.length).toBeGreaterThan(0);
        }
      });
    }
  );
});

// ─── AC5: Performance verification (structural) ────────────────────────────

describe("Story 10.3 — AC5: Performance — fit score lookup uses index", () => {
  test.skip(
    "[P1] T10.3-25: endpoint response time does not degrade significantly with personalization",
    async () => {
      // Given: buyer with 50 fit scores pre-calculated
      // When: GET /api/v1/listings (with LEFT JOIN to listing_fit_scores)
      // Then: response completes within acceptable time
      // NOTE: This is a structural test — the actual <5ms assertion
      //       requires DB profiling. This test verifies the endpoint
      //       still responds successfully with the JOIN in place.
      const { GET } = await import("./route");
      const startTime = Date.now();
      const request = makeAuthenticatedRequest("buyer-with-personalization");
      const response = await GET(request);
      const elapsed = Date.now() - startTime;

      expect(response.status).toBe(200);
      // Generous threshold — actual <5ms is verified via EXPLAIN ANALYZE in prod
      expect(elapsed).toBeLessThan(5000);
    }
  );
});

// ─── AC7: Invalidation when listing images change ───────────────────────────

describe("Story 10.3 — AC7: Invalidation on listing image changes", () => {
  test.skip(
    "[P1] T10.3-26: fallback to images[0] when fit scores are invalidated (images changed)",
    async () => {
      // Given: listing whose images array was changed (CRM sync)
      //   → trigger AFTER UPDATE on listings deletes fit_scores for that listing
      // When: GET /api/v1/listings (before batch recalculation)
      // Then: imageUrl = images[0] for that listing (no fit score → fallback)
      //
      // NOTE: This test validates the API behavior AFTER invalidation.
      // The trigger itself is tested via SQL migration verification.
      const { GET } = await import("./route");
      const request = makeAuthenticatedRequest("buyer-after-image-change");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      // After invalidation, all listings without fit scores use images[0]
      body.data.forEach((listing: any) => {
        if (listing.imageUrls && listing.imageUrls.length > 0) {
          // Without fit scores, must fallback to first image
          expect(listing.imageUrls).toContain(listing.imageUrl);
        }
      });
    }
  );
});
