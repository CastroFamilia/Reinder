/**
 * Zod validation schemas for the A/B experiment system.
 *
 * Client-side: form validation before submit
 * Server-side: PATCH body validation
 *
 * Story 9.2, AC3/AC5/AC8
 * Story 9.6, AC10 — extended for text experiment types
 */
import { z } from "zod";

// ─── Cover image variant schema ─────────────────────────────────────────────

const coverImageVariantSchema = z.object({
  coverImageUrl: z.string().url(),
  coverImageIndex: z.number().int().min(1), // min 1 because 0 is current cover
});

// ─── Text variant schema ────────────────────────────────────────────────────

const textVariantSchema = z.object({
  title: z.string().max(120).optional(),
  description: z.string().max(500).optional(),
});

// ─── Create experiment schema ───────────────────────────────────────────────

/** Client-side: create experiment form validation */
export const createExperimentSchema = z.discriminatedUnion("experimentType", [
  // Cover image experiments (Story 9.2)
  z.object({
    listingId: z.string().uuid("Selecciona un listing"),
    name: z
      .string()
      .min(3, "Mínimo 3 caracteres")
      .max(100, "Máximo 100 caracteres"),
    experimentType: z.literal("cover_image"),
    variantB: coverImageVariantSchema,
  }),
  // Title experiments (Story 9.6)
  z.object({
    listingId: z.string().uuid("Selecciona un listing"),
    name: z
      .string()
      .min(3, "Mínimo 3 caracteres")
      .max(100, "Máximo 100 caracteres"),
    experimentType: z.literal("title"),
    variantB: z.object({
      title: z.string().min(1, "Título requerido").max(120, "Máximo 120 caracteres"),
      description: z.string().optional(),
    }),
  }),
  // Description experiments (Story 9.6)
  z.object({
    listingId: z.string().uuid("Selecciona un listing"),
    name: z
      .string()
      .min(3, "Mínimo 3 caracteres")
      .max(100, "Máximo 100 caracteres"),
    experimentType: z.literal("description"),
    variantB: z.object({
      title: z.string().optional(),
      description: z.string().min(1, "Descripción requerida").max(500, "Máximo 500 caracteres"),
    }),
  }),
  // Title + description experiments (Story 9.6)
  z.object({
    listingId: z.string().uuid("Selecciona un listing"),
    name: z
      .string()
      .min(3, "Mínimo 3 caracteres")
      .max(100, "Máximo 100 caracteres"),
    experimentType: z.literal("title_and_description"),
    variantB: z.object({
      title: z.string().min(1, "Título requerido").max(120, "Máximo 120 caracteres"),
      description: z.string().min(1, "Descripción requerida").max(500, "Máximo 500 caracteres"),
    }),
  }),
]);

export type CreateExperimentInput = z.infer<typeof createExperimentSchema>;

/** Schema for the generate-variants API request body */
export const generateVariantsSchema = z.object({
  listingId: z.string().uuid(),
});

export type GenerateVariantsInput = z.infer<typeof generateVariantsSchema>;

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
