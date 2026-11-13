import type { Classification, EvidenceTier } from "@/types";

export type RankingRole = "LCA" | "UI/UX";
export type SortField = "score" | "experience";
export type SortDirection = "asc" | "desc";

export interface RankingEvidence {
  criterion_id: string;
  criterion_label: string;
  role: RankingRole;
  tier: EvidenceTier;
  matched_aliases: string[];
}

export interface RankingCandidate {
  candidate_id: string;
  source_confidence: number;
  review_required: boolean;
  experience: {
    total_experience_months_max: number | null;
    lca_experience_months_max: number | null;
  };
  warnings: {
    code: string;
    message: string;
    section?: string;
  }[];
  role_results: Record<
    RankingRole,
    {
      score: { total_score: number };
      classification: Classification;
      evidence: RankingEvidence[];
    }
  >;
}

export interface RankingFilters {
  label: Classification | "all";
  minimumScore: number;
  tier: EvidenceTier | "all";
  hasWarnings: boolean;
  search: string;
  sortBy: SortField;
  sortDirection: SortDirection;
}

export interface RankedCandidate {
  rank: number;
  candidate_id: string;
  score: number;
  classification: Classification;
  evidence: RankingEvidence[];
  experienceMonths: number | null;
  warnings: RankingCandidate["warnings"];
  hasWarnings: boolean;
  sourceConfidence: number;
  reviewRequired: boolean;
}

export const DEFAULT_RANKING_FILTERS: RankingFilters = {
  label: "all",
  minimumScore: 0,
  tier: "all",
  hasWarnings: false,
  search: "",
  sortBy: "score",
  sortDirection: "desc",
};

function getRelevantExperience(
  candidate: RankingCandidate,
  role: RankingRole,
): number | null {
  if (role === "LCA") {
    return candidate.experience.lca_experience_months_max;
  }

  // The current dataset does not establish a dedicated UI/UX
  // experience-month value. Do not substitute total experience.
  return null;
}

function compareNullableNumbers(
  a: number | null,
  b: number | null,
  direction: SortDirection,
): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;

  return direction === "desc" ? b - a : a - b;
}

function matchesSearch(
  candidate: RankedCandidate,
  query: string,
): boolean {
  if (!query.trim()) return true;

  const normalized = query.trim().toLowerCase();

  const searchable = [
    candidate.candidate_id,
    ...candidate.evidence.flatMap((item) => [
      item.criterion_label,
      item.criterion_id,
      item.tier,
      ...item.matched_aliases,
    ]),
    ...candidate.warnings.map((warning) => warning.code),
  ]
    .join(" ")
    .toLowerCase();

  return searchable.includes(normalized);
}

export function rankCandidates(
  candidates: RankingCandidate[],
  role: RankingRole,
  filters: RankingFilters = DEFAULT_RANKING_FILTERS,
): RankedCandidate[] {
  const results = candidates.map((candidate) => {
    const roleResult = candidate.role_results[role];

    const hasWarnings =
      candidate.warnings.length > 0 ||
      candidate.review_required ||
      candidate.source_confidence < 0.6 ||
      roleResult.classification === "needs_review" ||
      roleResult.evidence.some(
        (item) =>
          item.tier === "ambiguous" ||
          item.tier === "source_incomplete",
      );

    return {
      rank: 0,
      candidate_id: candidate.candidate_id,
      score: roleResult.score.total_score,
      classification: roleResult.classification,
      evidence: roleResult.evidence,
      experienceMonths: getRelevantExperience(candidate, role),
      warnings: candidate.warnings,
      hasWarnings,
      sourceConfidence: candidate.source_confidence,
      reviewRequired: candidate.review_required,
    };
  });

  const filtered = results.filter((candidate) => {
    if (
      filters.label !== "all" &&
      candidate.classification !== filters.label
    ) {
      return false;
    }

    if (candidate.score < filters.minimumScore) return false;

    if (
      filters.tier !== "all" &&
      !candidate.evidence.some((item) => item.tier === filters.tier)
    ) {
      return false;
    }

    if (filters.hasWarnings && !candidate.hasWarnings) return false;

    if (!matchesSearch(candidate, filters.search)) return false;

    return true;
  });

  filtered.sort((a, b) => {
    const comparison =
      filters.sortBy === "score"
        ? compareNullableNumbers(a.score, b.score, filters.sortDirection)
        : compareNullableNumbers(
            a.experienceMonths,
            b.experienceMonths,
            filters.sortDirection,
          );

    if (comparison !== 0) return comparison;

    return a.candidate_id.localeCompare(b.candidate_id);
  });

  return filtered.map((candidate, index) => ({
    ...candidate,
    rank: index + 1,
  }));
}
