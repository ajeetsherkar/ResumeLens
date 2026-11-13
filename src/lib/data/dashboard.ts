import "server-only";

import { readJson } from "./read-json";


import type { RankingCandidate, RankingRole } from "@/lib/ranking";

type Role = RankingRole;

type CandidateRecord = RankingCandidate & {
  role_results: Record<
    Role,
    {
      score: { total_score: number };
      classification: RankingCandidate["role_results"][Role]["classification"];
      evidence: {
        criterion_id: string;
        criterion_label: string;
        role: Role;
        tier: RankingCandidate["role_results"][Role]["evidence"][number]["tier"];
        matched_aliases: string[];
      }[];
    }
  >;
};

type ProfileRecord = {
  candidate_id: string;
  extraction_status: string;
  quality?: {
    issues?: {
      rule_id: string;
      type: string;
      reason: string;
    }[];
  };
};

export type ReviewReasonCategory =
  | "low_confidence"
  | "source_incomplete"
  | "ambiguous_evidence"
  | "conflicting_dates"
  | "extraction_error";

export type ReviewQueueItem = {
  candidateId: string;
  confidence: number;
  extractionStatus: string;
  roles: Role[];
  reasons: {
    category: ReviewReasonCategory;
    label: string;
    explanation: string;
  }[];
  extractionMessage: string | null;
};

export type DashboardData = {
  processed: number;
  failedFiles: number;
  needsReview: number;
  reviewQueue: ReviewQueueItem[];
  roles: Record<
    Role,
    {
      counts: {
        strong_match: number;
        potential_match: number;
        not_a_match: number;
        needs_review: number;
      };
      averageScore: number;
    }
  >;
  candidates: RankingCandidate[];
};

function toSafeCandidate(candidate: CandidateRecord): RankingCandidate {
  return {
    candidate_id: candidate.candidate_id,
    source_confidence: candidate.source_confidence,
    review_required: candidate.review_required,
    experience: {
      total_experience_months_max:
        candidate.experience.total_experience_months_max,
      lca_experience_months_max:
        candidate.experience.lca_experience_months_max,
    },
    warnings: candidate.warnings.map((warning) => ({
      code: warning.code,
      message: warning.message,
      ...(warning.section ? { section: warning.section } : {}),
    })),
    role_results: {
      LCA: {
        score: { total_score: candidate.role_results.LCA.score.total_score },
        classification: candidate.role_results.LCA.classification,
        evidence: candidate.role_results.LCA.evidence.map((item) => ({
          criterion_id: item.criterion_id,
          criterion_label: item.criterion_label,
          role: item.role,
          tier: item.tier,
          matched_aliases: item.matched_aliases,
        })),
      },
      "UI/UX": {
        score: {
          total_score: candidate.role_results["UI/UX"].score.total_score,
        },
        classification: candidate.role_results["UI/UX"].classification,
        evidence: candidate.role_results["UI/UX"].evidence.map((item) => ({
          criterion_id: item.criterion_id,
          criterion_label: item.criterion_label,
          role: item.role,
          tier: item.tier,
          matched_aliases: item.matched_aliases,
        })),
      },
    },
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  const rawCandidates = await readJson<CandidateRecord[]>("candidates.json");
  const profiles = await readJson<ProfileRecord[]>("structured-profiles.json");

  const profileById = new Map(
    profiles.map((profile) => [profile.candidate_id, profile]),
  );

  const roles: DashboardData["roles"] = {
    LCA: {
      counts: {
        strong_match: 0,
        potential_match: 0,
        not_a_match: 0,
        needs_review: 0,
      },
      averageScore: 0,
    },
    "UI/UX": {
      counts: {
        strong_match: 0,
        potential_match: 0,
        not_a_match: 0,
        needs_review: 0,
      },
      averageScore: 0,
    },
  };

  let needsReview = 0;
  let failedFiles = 0;
  const reviewQueue: ReviewQueueItem[] = [];

  const scoreTotals: Record<Role, number> = {
    LCA: 0,
    "UI/UX": 0,
  };

  for (const candidate of rawCandidates) {
    const profile = profileById.get(candidate.candidate_id);

    if (!profile) {
      throw new Error(
        `Missing structured profile for candidate ${candidate.candidate_id}.`,
      );
    }

    if (["failed", "empty"].includes(profile.extraction_status)) {
      failedFiles += 1;
    }

    const evidenceNeedsReview = (["LCA", "UI/UX"] as Role[]).some((role) =>
      candidate.role_results[role].evidence.some((item) =>
        ["ambiguous", "source_incomplete"].includes(item.tier),
      ),
    );

    const reasons: ReviewQueueItem["reasons"] = [];
    const addReason = (
      category: ReviewReasonCategory,
      label: string,
      explanation: string,
    ) => {
      if (!reasons.some((reason) => reason.category === category && reason.explanation === explanation)) {
        reasons.push({ category, label, explanation });
      }
    };

    if (candidate.source_confidence < 0.6) {
      addReason(
        "low_confidence",
        "Low confidence",
        `Source confidence is ${(candidate.source_confidence * 100).toFixed(1)}%, below the 60% review threshold.`,
      );
    }

    for (const issue of profile.quality?.issues ?? []) {
      const isDateIssue =
        issue.rule_id === "R4" || issue.rule_id === "R6";

      if (isDateIssue) {
        addReason(
          "conflicting_dates",
          "Date validation",
          issue.reason,
        );
      } else if (issue.type === "extraction_error") {
        addReason(
          "extraction_error",
          "Extraction error",
          issue.reason,
        );
      } else if (issue.type === "ambiguous_evidence") {
        addReason(
          "ambiguous_evidence",
          "Ambiguous evidence",
          issue.reason,
        );
      } else if (issue.type === "source_incomplete") {
        addReason(
          "source_incomplete",
          "Incomplete source",
          issue.reason,
        );
      }
    }

    if (["failed", "empty"].includes(profile.extraction_status)) {
      addReason(
        "extraction_error",
        "Extraction error",
        profile.extraction_status === "empty"
          ? "No readable text was extracted from this file."
          : "Text extraction failed for this file.",
      );
    }

    const needsHumanReview =
      candidate.review_required ||
      candidate.source_confidence < 0.6 ||
      ["failed", "empty"].includes(profile.extraction_status) ||
      evidenceNeedsReview;

    if (needsHumanReview) {
      needsReview += 1;

      if (reasons.length === 0) {
        addReason(
          "source_incomplete",
          "Manual review required",
          "The screening pipeline flagged this candidate for human review.",
        );
      }

      const rolesNeedingReview = (["LCA", "UI/UX"] as Role[]).filter((role) =>
        candidate.role_results[role].evidence.some((item) =>
          ["ambiguous", "source_incomplete"].includes(item.tier),
        ),
      );

      reviewQueue.push({
        candidateId: candidate.candidate_id,
        confidence: candidate.source_confidence,
        extractionStatus: profile.extraction_status,
        roles: rolesNeedingReview,
        reasons,
        extractionMessage: ["failed", "empty"].includes(profile.extraction_status)
          ? profile.extraction_status === "empty"
            ? "No readable text was extracted (0 characters). Check the original file and upload a text-readable version."
            : "The file could not be processed. Check the original file and try uploading it again."
          : null,
      });
    }

    for (const role of ["LCA", "UI/UX"] as Role[]) {
      const result = candidate.role_results[role];

      roles[role].counts[result.classification] += 1;
      scoreTotals[role] += result.score.total_score;
    }
  }

  for (const role of ["LCA", "UI/UX"] as Role[]) {
    roles[role].averageScore =
      rawCandidates.length > 0
        ? Math.round((scoreTotals[role] / rawCandidates.length) * 10) / 10
        : 0;
  }

  return {
    processed: rawCandidates.length,
    failedFiles,
    needsReview,
    reviewQueue: reviewQueue.sort(
      (a, b) => a.confidence - b.confidence || a.candidateId.localeCompare(b.candidateId),
    ),
    roles,
    candidates: rawCandidates.map(toSafeCandidate),
  };
}
