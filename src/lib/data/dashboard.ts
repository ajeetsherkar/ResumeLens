import "server-only";

import fs from "node:fs";
import path from "node:path";

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
};

const dataDirectory = path.join(process.cwd(), "data", "processed");

function readJson<T>(filename: string): T {
  const filePath = path.join(dataDirectory, filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Required dashboard data is missing: ${filename}. Run the dataset generation scripts first.`,
    );
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

export type DashboardData = {
  processed: number;
  failedFiles: number;
  needsReview: number;
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

export function getDashboardData(): DashboardData {
  const rawCandidates = readJson<CandidateRecord[]>("candidates.json");
  const profiles = readJson<ProfileRecord[]>("structured-profiles.json");

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

    if (
      candidate.review_required ||
      candidate.source_confidence < 0.6 ||
      ["failed", "empty"].includes(profile.extraction_status) ||
      evidenceNeedsReview
    ) {
      needsReview += 1;
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
    roles,
    candidates: rawCandidates.map(toSafeCandidate),
  };
}
