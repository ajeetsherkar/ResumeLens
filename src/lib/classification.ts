import { CLASSIFICATION_RULES } from "../config";
import type { Classification } from "../types";

export interface ClassificationInput {
  score: number;
  sourceConfidence: number;
  reviewRequired?: boolean;
}

export interface ClassificationRules {
  strong_match_min_score: number;
  potential_match_min_score: number;
  minimum_source_confidence: number;
}

/**
 * Classifies a candidate independently of relocation and availability.
 * Explicit review flags and low source confidence override score thresholds.
 */
export function classifyRole(
  input: ClassificationInput,
  rules: ClassificationRules = CLASSIFICATION_RULES,
): Classification {
  const { score, sourceConfidence, reviewRequired = false } = input;

  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new Error("Score must be a finite number between 0 and 100.");
  }

  if (
    !Number.isFinite(sourceConfidence) ||
    sourceConfidence < 0 ||
    sourceConfidence > 1
  ) {
    throw new Error("Source confidence must be between 0 and 1.");
  }

  if (
    rules.potential_match_min_score < 0 ||
    rules.strong_match_min_score > 100 ||
    rules.potential_match_min_score >= rules.strong_match_min_score ||
    rules.minimum_source_confidence < 0 ||
    rules.minimum_source_confidence > 1
  ) {
    throw new Error("Classification rules contain invalid thresholds.");
  }

  if (
    reviewRequired ||
    sourceConfidence < rules.minimum_source_confidence
  ) {
    return "needs_review";
  }

  if (score >= rules.strong_match_min_score) {
    return "strong_match";
  }

  if (score >= rules.potential_match_min_score) {
    return "potential_match";
  }

  return "not_a_match";
}
