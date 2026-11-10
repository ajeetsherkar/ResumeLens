import { ROLE_WEIGHTS } from "../config";
import type { Candidate } from "../types";

export type ValidationResult =
  | { valid: true; errors: [] }
  | { valid: false; errors: string[] };

export function validateWeightTables(
  tables: Record<string, Record<string, number>> = ROLE_WEIGHTS,
): ValidationResult {
  const errors: string[] = [];

  for (const [role, weights] of Object.entries(tables)) {
    const values = Object.values(weights);

    if (values.length === 0) {
      errors.push(`${role}: weight table must not be empty`);
      continue;
    }

    if (values.some((weight) => !Number.isFinite(weight) || weight < 0)) {
      errors.push(`${role}: weights must be finite, non-negative numbers`);
      continue;
    }

    const total = values.reduce((sum, weight) => sum + weight, 0);

    if (total !== 100) {
      errors.push(`${role}: weights sum to ${total}, expected 100`);
    }
  }

  return errors.length === 0
    ? { valid: true, errors: [] }
    : { valid: false, errors };
}

export function validateCandidate(
  candidate: unknown,
): ValidationResult {
  const errors: string[] = [];

  if (
    typeof candidate !== "object" ||
    candidate === null ||
    Array.isArray(candidate)
  ) {
    return {
      valid: false,
      errors: ["Candidate must be a non-null object"],
    };
  }

  const value = candidate as Partial<Candidate>;

  if (
    typeof value.candidate_id !== "string" ||
    value.candidate_id.trim() === ""
  ) {
    errors.push("candidate_id must be a non-empty string");
  }

  if (
    typeof value.source_file !== "string" ||
    value.source_file.trim() === ""
  ) {
    errors.push("source_file must be a non-empty string");
  }

  const extractionStatuses = [
    "pending",
    "success",
    "partial",
    "failed",
  ];

  if (
    typeof value.extraction_status !== "string" ||
    !extractionStatuses.includes(value.extraction_status)
  ) {
    errors.push("extraction_status is invalid");
  }

  if (typeof value.extracted_text !== "string") {
    errors.push("extracted_text must be a string");
  }

  if (!Array.isArray(value.warnings)) {
    errors.push("warnings must be an array");
  }

  if (!Array.isArray(value.evidence)) {
    errors.push("evidence must be an array");
  }

  if (!Array.isArray(value.role_scores)) {
    errors.push("role_scores must be an array");
  }

  const experience = value.experience;

  if (
    typeof experience !== "object" ||
    experience === null ||
    Array.isArray(experience)
  ) {
    errors.push("experience must be an object");
  } else {
    if (
      !Number.isInteger(experience.months_max) ||
      experience.months_max < 0
    ) {
      errors.push("experience.months_max must be a non-negative integer");
    }

    if (
      !Number.isFinite(experience.confidence) ||
      experience.confidence < 0 ||
      experience.confidence > 1
    ) {
      errors.push("experience.confidence must be between 0 and 1");
    }

    const attributions = [
      "employment",
      "internship",
      "project",
      "education",
      "unknown",
    ];

    if (!attributions.includes(experience.attribution)) {
      errors.push("experience.attribution is invalid");
    }

    const conventions = [
      "inclusive_calendar_months",
      "elapsed_months",
    ];

    if (!conventions.includes(experience.convention)) {
      errors.push("experience.convention is invalid");
    }
  }

  const classifications = [
    "strong_match",
    "potential_match",
    "not_a_match",
    "needs_review",
  ];

  if (
    typeof value.classification !== "string" ||
    !classifications.includes(value.classification)
  ) {
    errors.push("classification is invalid");
  }

  return errors.length === 0
    ? { valid: true, errors: [] }
    : { valid: false, errors };
}
