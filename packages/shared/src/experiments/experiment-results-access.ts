/**
 * Story 9.3 — Access validation helper for experiment results.
 *
 * Validates whether a user has access to view experiment results.
 * Pure function — used by both API route and tests.
 *
 * Source: story 9-3, AC6 auth rules
 */

export type ExperimentResultsAccessInput = {
  role: string;
  agencyId: string | null;
  experimentAgencyId: string;
};

export type ExperimentResultsAccessResult =
  | { allowed: true }
  | { allowed: false; statusCode: 403 | 404; message: string };

/**
 * Validates whether the requesting user has access to view experiment results.
 *
 * - Only `agency_admin` role is allowed (403 for others).
 * - The experiment must belong to the user's agency (404 for cross-agency access).
 */
export function validateExperimentResultsAccess(
  input: ExperimentResultsAccessInput
): ExperimentResultsAccessResult {
  if (input.role !== "agency_admin" || !input.agencyId) {
    return {
      allowed: false,
      statusCode: 403,
      message: "Agency Admin role required",
    };
  }

  if (input.agencyId !== input.experimentAgencyId) {
    return {
      allowed: false,
      statusCode: 404,
      message: "Experiment not found",
    };
  }

  return { allowed: true };
}
