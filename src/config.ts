import type {
  EvidenceTier,
  MonthCountingConvention,
} from "./types";

/**
 * These are the frozen criterion weights.
 * Each role's weights must sum to exactly 100.
 */
export const ROLE_WEIGHTS = {
  LCA: {
    technical_skills: 25,
    relevant_experience: 20,
    projects: 15,
    education: 15,
    problem_solving: 10,
    communication: 10,
    additional_relevance: 5,
  },
  "UI/UX": {
    design_skills: 20,
    portfolio: 20,
    user_research: 25,
    relevant_experience: 15,
    education: 10,
    communication: 10,
  },
} as const satisfies Record<string, Record<string, number>>;

export const EVIDENCE_TIER_CREDITS: Record<EvidenceTier, number> = {
  demonstrated: 1.0,
  listed_only: 0.5,
  ambiguous: 0.25,
  missing: 0.0,
};

/**
 * Placeholder only. Calibrate this after score distribution
 * analysis and held-out evaluation.
 */
export const CLASSIFICATION_THRESHOLD: number | null = null;

/**
 * Elapsed month-index difference.
 * Example: Sep 2021 to Jun 2023 = 21 months.
 * Date-derived upper-bound estimates, not verified full-time duration.
 */
export const MONTH_COUNTING_CONVENTION: MonthCountingConvention =
  "elapsed_months";

/**
 * Provisional source-quality weights.
 * These are explicit configuration values, not frozen assignment rules.
 * Revisit them when source-quality policy is finalized.
 */
export const SOURCE_QUALITY_RULE_WEIGHTS = {
  direct_resume_evidence: 1.0,
  structured_resume_section: 0.8,
  inferred_or_ambiguous_text: 0.5,
  missing_or_unverifiable: 0.0,
} as const;
