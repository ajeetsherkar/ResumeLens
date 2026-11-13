import { describe, expect, it } from "vitest";

import {
  DEFAULT_RANKING_FILTERS,
  rankCandidates,
} from "./ranking";

import type {
  RankingCandidate,
  RankingFilters,
  RankingRole,
} from "./ranking";

function makeCandidate(
  id: string,
  options: {
    score?: number;
    classification?: RankingCandidate["role_results"]["LCA"]["classification"];
    lcaMonths?: number | null;
    tier?: RankingCandidate["role_results"]["LCA"]["evidence"][number]["tier"];
    criterionLabel?: string;
    aliases?: string[];
    warnings?: RankingCandidate["warnings"];
    reviewRequired?: boolean;
    sourceConfidence?: number;
  } = {},
): RankingCandidate {
  const evidence = {
    criterion_id: "lca_methodology",
    criterion_label: options.criterionLabel ?? "Life Cycle Assessment",
    role: "LCA" as const,
    tier: options.tier ?? "demonstrated",
    matched_aliases: options.aliases ?? ["LCA"],
  };

  const roleResult = {
    score: { total_score: options.score ?? 50 },
    classification: options.classification ?? "potential_match" as const,
    evidence: [evidence],
  };

  return {
    candidate_id: id,
    source_confidence: options.sourceConfidence ?? 0.9,
    review_required: options.reviewRequired ?? false,
    experience: {
      total_experience_months_max: null,
      lca_experience_months_max: options.lcaMonths ?? null,
    },
    warnings: options.warnings ?? [],
    role_results: {
      LCA: roleResult,
      "UI/UX": {
        ...roleResult,
        evidence: [
          {
            ...evidence,
            role: "UI/UX",
            criterion_id: "visual_design",
            criterion_label: "Visual Design",
            matched_aliases: ["Figma"],
          },
        ],
      },
    },
  };
}

function rank(
  candidates: RankingCandidate[],
  role: RankingRole = "LCA",
  overrides: Partial<RankingFilters> = {},
) {
  return rankCandidates(candidates, role, {
    ...DEFAULT_RANKING_FILTERS,
    ...overrides,
  });
}

describe("rankCandidates", () => {
  it("sorts by score descending by default", () => {
    const result = rank([
      makeCandidate("C-001", { score: 40 }),
      makeCandidate("C-002", { score: 85 }),
      makeCandidate("C-003", { score: 60 }),
    ]);

    expect(result.map((item) => item.candidate_id)).toEqual([
      "C-002",
      "C-003",
      "C-001",
    ]);
    expect(result.map((item) => item.rank)).toEqual([1, 2, 3]);
  });

  it("sorts by score ascending when requested", () => {
    const result = rank(
      [
        makeCandidate("C-001", { score: 40 }),
        makeCandidate("C-002", { score: 85 }),
      ],
      "LCA",
      { sortDirection: "asc" },
    );

    expect(result.map((item) => item.score)).toEqual([40, 85]);
  });

  it("sorts LCA experience in descending order", () => {
    const result = rank(
      [
        makeCandidate("C-001", { lcaMonths: 8 }),
        makeCandidate("C-002", { lcaMonths: 24 }),
        makeCandidate("C-003", { lcaMonths: 12 }),
      ],
      "LCA",
      { sortBy: "experience" },
    );

    expect(result.map((item) => item.experienceMonths)).toEqual([
      24, 12, 8,
    ]);
  });

  it("keeps unknown experience last in either sort direction", () => {
    const candidates = [
      makeCandidate("C-001", { lcaMonths: null }),
      makeCandidate("C-002", { lcaMonths: 12 }),
      makeCandidate("C-003", { lcaMonths: 6 }),
    ];

    const descending = rank(candidates, "LCA", {
      sortBy: "experience",
      sortDirection: "desc",
    });

    const ascending = rank(candidates, "LCA", {
      sortBy: "experience",
      sortDirection: "asc",
    });

    expect(descending.map((item) => item.experienceMonths)).toEqual([
      12, 6, null,
    ]);
    expect(ascending.map((item) => item.experienceMonths)).toEqual([
      6, 12, null,
    ]);
  });

  it("filters by classification", () => {
    const result = rank(
      [
        makeCandidate("C-001", { classification: "strong_match" }),
        makeCandidate("C-002", { classification: "potential_match" }),
        makeCandidate("C-003", { classification: "not_a_match" }),
      ],
      "LCA",
      { label: "strong_match" },
    );

    expect(result.map((item) => item.candidate_id)).toEqual(["C-001"]);
  });

  it("filters by minimum score", () => {
    const result = rank(
      [
        makeCandidate("C-001", { score: 35 }),
        makeCandidate("C-002", { score: 65 }),
        makeCandidate("C-003", { score: 80 }),
      ],
      "LCA",
      { minimumScore: 60 },
    );

    expect(result.map((item) => item.candidate_id)).toEqual([
      "C-003",
      "C-002",
    ]);
  });

  it("filters by evidence tier", () => {
    const result = rank(
      [
        makeCandidate("C-001", { tier: "demonstrated" }),
        makeCandidate("C-002", { tier: "listed_only" }),
        makeCandidate("C-003", { tier: "ambiguous" }),
      ],
      "LCA",
      { tier: "listed_only" },
    );

    expect(result.map((item) => item.candidate_id)).toEqual(["C-002"]);
  });

  it("searches candidate ID, evidence label, and matched aliases", () => {
    const candidates = [
      makeCandidate("C-001", {
        criterionLabel: "Life Cycle Assessment",
        aliases: ["GaBi"],
      }),
      makeCandidate("C-002", {
        criterionLabel: "Carbon Footprint",
        aliases: ["GHG"],
      }),
    ];

    expect(rank(candidates, "LCA", { search: "c-001" })).toHaveLength(1);
    expect(rank(candidates, "LCA", { search: "carbon footprint" })).toHaveLength(1);
    expect(rank(candidates, "LCA", { search: "gabi" })[0]?.candidate_id).toBe(
      "C-001",
    );
  });

  it("detects explicit warnings and review conditions", () => {
    const candidates = [
      makeCandidate("C-001"),
      makeCandidate("C-002", {
        warnings: [{ code: "missing_section", message: "Section missing" }],
      }),
      makeCandidate("C-003", { reviewRequired: true }),
      makeCandidate("C-004", { sourceConfidence: 0.4 }),
      makeCandidate("C-005", { tier: "ambiguous" }),
    ];

    const result = rank(candidates, "LCA", { hasWarnings: true });

    expect(result.map((item) => item.candidate_id).sort()).toEqual([
      "C-002",
      "C-003",
      "C-004",
      "C-005",
    ]);
  });

  it("recalculates ranks after filtering", () => {
    const result = rank(
      [
        makeCandidate("C-001", { score: 90 }),
        makeCandidate("C-002", { score: 40 }),
        makeCandidate("C-003", { score: 70 }),
      ],
      "LCA",
      { minimumScore: 60 },
    );

    expect(result.map((item) => item.rank)).toEqual([1, 2]);
    expect(result.map((item) => item.candidate_id)).toEqual([
      "C-001",
      "C-003",
    ]);
  });

  it("does not invent UI/UX experience months from total experience", () => {
    const candidate = makeCandidate("C-001", { lcaMonths: 18 });
    candidate.experience.total_experience_months_max = 36;

    const result = rank([candidate], "UI/UX");

    expect(result[0]?.experienceMonths).toBeNull();
  });

  it("does not expose resume snippets in ranking evidence", () => {
    const result = rank([makeCandidate("C-001")]);

    expect(result[0]?.evidence[0]).not.toHaveProperty("snippets");
    expect(result[0]?.evidence[0]).not.toHaveProperty("reason");
  });
});
