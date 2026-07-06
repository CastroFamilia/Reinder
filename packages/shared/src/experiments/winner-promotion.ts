/**
 * Story 9.4 — Winner declaration & auto-promotion service.
 *
 * Handles the full lifecycle after significance is reached:
 * 1. Declare winner (status → completed, winner_variant set)
 * 2. Promote winner (update listing content, log audit, status → winner_promoted)
 * 3. Rollback promotion (restore original content)
 *
 * All operations are transactional — partial updates are impossible.
 *
 * Source: story 9-4, AC4–AC6, AC8, Task 3
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  listings,
  listingExperiments,
  experimentPromotionLogs,
} from "../db/schema";
import type { VariantContent } from "../types/experiment";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PromotionResult {
  listingId: string;
  experimentId: string;
  promotedVariant: "a" | "b";
  previousContent: VariantContent;
  promotedContent: VariantContent;
}

export interface RollbackResult {
  listingId: string;
  experimentId: string;
  restoredVariant: "a";
  restoredContent: VariantContent;
}

// ─── Declare winner ─────────────────────────────────────────────────────────

/**
 * Updates experiment status to 'completed' and sets winner_variant.
 * Called after significance engine determines a winner.
 */
export async function declareWinner(
  db: PostgresJsDatabase,
  experimentId: string,
  winnerVariant: "a" | "b"
): Promise<void> {
  await db
    .update(listingExperiments)
    .set({
      status: "completed",
      winnerVariant,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(listingExperiments.id, experimentId));
}

// ─── Promote winner ─────────────────────────────────────────────────────────

/**
 * Promotes the winning variant to the listing content.
 * Transactional: listing update + status change + audit log are atomic.
 * Idempotent: running twice on a `winner_promoted` experiment is a no-op.
 *
 * @param db - Drizzle database instance
 * @param experimentId - UUID of the experiment
 * @returns PromotionResult with before/after content
 */
export async function promoteWinner(
  db: PostgresJsDatabase,
  experimentId: string
): Promise<PromotionResult | null> {
  // Load experiment
  const [experiment] = await db
    .select()
    .from(listingExperiments)
    .where(eq(listingExperiments.id, experimentId))
    .limit(1);

  if (!experiment || !experiment.winnerVariant) {
    return null;
  }

  // Idempotent: skip if already promoted
  if (experiment.status === "winner_promoted") {
    return null;
  }

  const winnerContent = (
    experiment.winnerVariant === "a"
      ? experiment.variantA
      : experiment.variantB
  ) as VariantContent;

  const previousContent = experiment.variantA as VariantContent;

  // Load listing for cover_image reordering
  const [listing] = await db
    .select()
    .from(listings)
    .where(eq(listings.id, experiment.listingId))
    .limit(1);

  if (!listing) {
    throw new Error(`Listing ${experiment.listingId} not found for promotion`);
  }

  // Build listing update based on experiment type
  const listingUpdate: Record<string, unknown> = { updatedAt: new Date() };

  switch (experiment.experimentType) {
    case "cover_image": {
      const images = [...((listing.images as string[]) || [])];
      const targetIndex = winnerContent.coverImageIndex ?? 0;
      if (targetIndex > 0 && targetIndex < images.length) {
        const [img] = images.splice(targetIndex, 1);
        images.unshift(img);
      }
      listingUpdate.images = images;
      break;
    }
    case "title":
      listingUpdate.title = winnerContent.title!;
      break;
    case "description":
      listingUpdate.description = winnerContent.description!;
      break;
    case "title_and_description":
      listingUpdate.title = winnerContent.title!;
      listingUpdate.description = winnerContent.description!;
      break;
  }

  // Transaction: update listing + status + audit log
  await db.transaction(async (tx) => {
    await tx
      .update(listings)
      .set(listingUpdate)
      .where(eq(listings.id, experiment.listingId));

    await tx
      .update(listingExperiments)
      .set({ status: "winner_promoted", updatedAt: new Date() })
      .where(eq(listingExperiments.id, experiment.id));

    await tx.insert(experimentPromotionLogs).values({
      experimentId: experiment.id,
      listingId: experiment.listingId,
      promotedVariant: experiment.winnerVariant as "a" | "b",
      experimentType: experiment.experimentType,
      previousContent: previousContent,
      promotedContent: winnerContent,
      promotedBy: "system",
    });
  });

  return {
    listingId: experiment.listingId,
    experimentId: experiment.id,
    promotedVariant: experiment.winnerVariant as "a" | "b",
    previousContent,
    promotedContent: winnerContent,
  };
}

// ─── Rollback promotion ─────────────────────────────────────────────────────

/**
 * Restores listing content to the original (variant_a) state.
 * Only works on experiments with status 'winner_promoted'.
 *
 * @param db - Drizzle database instance
 * @param experimentId - UUID of the experiment
 * @returns RollbackResult or null if experiment not found
 * @throws Error if experiment status is not 'winner_promoted'
 */
export async function rollbackPromotion(
  db: PostgresJsDatabase,
  experimentId: string
): Promise<RollbackResult> {
  const [experiment] = await db
    .select()
    .from(listingExperiments)
    .where(eq(listingExperiments.id, experimentId))
    .limit(1);

  if (!experiment) {
    throw new Error(`Experiment ${experimentId} not found`);
  }

  if (experiment.status !== "winner_promoted") {
    throw new Error("INVALID_STATE_FOR_ROLLBACK");
  }

  const originalContent = experiment.variantA as VariantContent;

  // Load listing for cover_image reordering
  const [listing] = await db
    .select()
    .from(listings)
    .where(eq(listings.id, experiment.listingId))
    .limit(1);

  if (!listing) {
    throw new Error(`Listing ${experiment.listingId} not found for rollback`);
  }

  // Build listing restore update
  const listingUpdate: Record<string, unknown> = { updatedAt: new Date() };

  switch (experiment.experimentType) {
    case "cover_image": {
      // Restore original image order — variant_a stores the original coverImageIndex
      const images = [...((listing.images as string[]) || [])];
      const originalIndex = originalContent.coverImageIndex ?? 0;
      // Move current first image back to its original position
      if (originalIndex > 0 && images.length > originalIndex) {
        const [img] = images.splice(0, 1);
        images.splice(originalIndex, 0, img);
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

  // Transaction: restore listing + update status + audit log
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

  return {
    listingId: experiment.listingId,
    experimentId: experiment.id,
    restoredVariant: "a",
    restoredContent: originalContent,
  };
}
