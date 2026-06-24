/**
 * Zod validation schemas for the A/B experiment system.
 *
 * Client-side: form validation before submit
 * Server-side: PATCH body validation
 *
 * Story 9.2, AC3/AC5/AC8
 */
import { z } from "zod";

/** Client-side: create experiment form validation */
export const createExperimentSchema = z.object({
  listingId: z.string().uuid("Selecciona un listing"),
  name: z
    .string()
    .min(3, "Mínimo 3 caracteres")
    .max(100, "Máximo 100 caracteres"),
  experimentType: z.literal("cover_image"),
  variantB: z.object({
    coverImageUrl: z.string().url(),
    coverImageIndex: z.number().int().min(1), // min 1 because 0 is current cover
  }),
});

export type CreateExperimentInput = z.infer<typeof createExperimentSchema>;

/** Server-side: PATCH body for status transitions */
export const updateExperimentStatusSchema = z.object({
  status: z.enum(["running", "paused", "cancelled"]),
});

export type UpdateExperimentStatusInput = z.infer<
  typeof updateExperimentStatusSchema
>;

/**
 * State machine: valid experiment status transitions.
 * Terminal states (completed, cancelled) have no transitions.
 *
 * Story 9.2, AC8
 */
export const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["running", "cancelled"],
  running: ["paused", "cancelled"],
  paused: ["running", "cancelled"],
};

/** Check if a state transition is valid */
export function isValidTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
