/**
 * Types for AI-powered listing variant generation.
 *
 * Story 9.6, Task 6
 */

/** A single AI-generated variant of listing content. */
export type AiVariant = {
  /** Short descriptive label (e.g., "Emocional", "Factual", "Premium") */
  label: string;
  /** Generated title (≤120 chars) */
  title: string;
  /** Generated description (≤500 chars) */
  description: string;
};

/** Response from the generate-variants API endpoint. */
export type AiGenerateVariantsResponse = {
  variants: AiVariant[];
};

/** Row type for the ai_generation_usage tracking table. */
export type AiGenerationUsage = {
  id: string;
  agencyId: string;
  listingId: string;
  userId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  createdAt: string;
};
