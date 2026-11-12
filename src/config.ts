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
  // Conservative credit: damaged sources cannot establish reliable evidence.
  source_incomplete: 0.0,
};

/**
 * Placeholder only. Calibrate this after score distribution
 * analysis and held-out evaluation.
 */
export const CLASSIFICATION_THRESHOLD: number | null = null;


/**
 * Individual evidence criterion weights.
 * Each role totals exactly 100 points.
 * These are initial project weights and require later calibration.
 */
export const ROLE_CRITERION_WEIGHTS = {
  LCA: {
    lca_methodology: 20,
    lci: 10,
    lca_standards: 15,
    lca_software: 15,
    epd: 10,
    impact_assessment: 10,
    carbon_footprint: 10,
    environmental_assessment: 10,
  },
  "UI/UX": {
    design_tools: 10,
    wireframing: 8,
    prototyping: 10,
    interaction_design: 10,
    visual_design: 10,
    user_research: 15,
    usability_testing: 12,
    design_methods: 10,
    research_artifacts: 8,
    design_systems: 7,
  },
} as const;

/**
 * Provisional classification rules.
 * The low-confidence override takes precedence over score thresholds.
 */
export const CLASSIFICATION_RULES = {
  strong_match_min_score: 75,
  potential_match_min_score: 50,
  minimum_source_confidence: 0.60,
} as const;

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

/**
 * Provisional severity weights for deterministic source-quality rules.
 * Confidence = 1 - (sum of fired rule weights / sum of all rule weights).
 * These values must be calibrated and documented before final evaluation.
 */
export const QUALITY_RULE_WEIGHTS = {
  R1: 1.00,
  R2: 0.60,
  R3: 0.90,
  R4: 0.50,
  R5: 0.40,
  R6: 1.00,
  R7: 0.10,
  R8: 0.80,
} as const;
