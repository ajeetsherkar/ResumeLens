import {
  EVIDENCE_TIER_CREDITS,
  ROLE_CRITERION_WEIGHTS,
} from "../config";
import type {
  CriterionScore,
  EvidenceItem,
  RoleScore,
} from "../types";
import {
  assessEvidence,
  type EvidenceInput,
  type VerifiedEvidence,
} from "./evidence";
import type { EvidenceRole } from "./evidence-dictionary";

function roundScore(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function scoreCriterion(
  evidence: VerifiedEvidence,
  weight: number,
): CriterionScore {
  const credit = EVIDENCE_TIER_CREDITS[evidence.tier];
  const score = roundScore(weight * credit);

  const verifiedItems: EvidenceItem[] = evidence.snippets.map(snippet => ({
    tier: evidence.tier,
    snippet: snippet.text,
    section: snippet.section,
    start_offset: snippet.start_offset,
    end_offset: snippet.end_offset,
  }));

  return {
    criterion_id: evidence.criterion_id,
    score,
    max_score: weight,
    evidence: verifiedItems,
    explanation:
      `${evidence.criterion_label}: ${evidence.tier} evidence; ` +
      `${credit} credit × ${weight} weight = ${score}/${weight}. ` +
      evidence.reason,
  };
}

/**
 * Scores one role using only verified evidence and configured criterion weights.
 * Candidate names, institutions, and eligibility flags are deliberately excluded.
 */
export function scoreRole(
  input: EvidenceInput,
  role: EvidenceRole,
): RoleScore {
  const weights = ROLE_CRITERION_WEIGHTS[role] as Record<string, number>;
  const assessments = assessEvidence(input, role);

  const expectedIds = Object.keys(weights);
  const actualIds = assessments.map(item => item.criterion_id);

  if (
    expectedIds.length !== actualIds.length ||
    expectedIds.some(id => !actualIds.includes(id)) ||
    actualIds.some(id => !(id in weights))
  ) {
    throw new Error(`Scoring weights do not match the ${role} evidence dictionary.`);
  }

  const criteria = assessments.map(item =>
    scoreCriterion(item, weights[item.criterion_id]),
  );

  const maxScore = Object.values(weights).reduce(
    (sum, weight) => sum + weight,
    0,
  );

  const earnedScore = criteria.reduce(
    (sum, criterion) => sum + criterion.score,
    0,
  );

  return {
    role_id: role,
    total_score: roundScore((earnedScore / maxScore) * 100),
    max_score: maxScore,
    criteria,
  };
}
