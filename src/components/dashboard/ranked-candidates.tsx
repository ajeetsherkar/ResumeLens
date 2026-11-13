"use client";

import { useMemo, useState } from "react";

import {
  DEFAULT_RANKING_FILTERS,
  rankCandidates,
} from "@/lib/ranking";

import type {
  RankingCandidate,
  RankingFilters,
  RankingRole,
} from "@/lib/ranking";

const classificationLabels = {
  strong_match: "Strong match",
  potential_match: "Potential",
  not_a_match: "Not a match",
  needs_review: "Needs review",
} as const;

const classificationStyles = {
  strong_match: "border-emerald-200 bg-emerald-50 text-emerald-700",
  potential_match: "border-blue-200 bg-blue-50 text-blue-700",
  not_a_match: "border-slate-200 bg-slate-100 text-slate-600",
  needs_review: "border-amber-200 bg-amber-50 text-amber-700",
} as const;

const tierStyles = {
  demonstrated: "bg-emerald-50 text-emerald-700",
  listed_only: "bg-blue-50 text-blue-700",
  ambiguous: "bg-amber-50 text-amber-700",
  missing: "bg-slate-100 text-slate-500",
  source_incomplete: "bg-rose-50 text-rose-700",
} as const;

const tierLabels = {
  demonstrated: "Demonstrated",
  listed_only: "Listed",
  ambiguous: "Ambiguous",
  missing: "Missing",
  source_incomplete: "Incomplete",
} as const;

export default function RankedCandidates({
  candidates,
  role,
}: {
  candidates: RankingCandidate[];
  role: RankingRole;
}) {
  const [filters, setFilters] = useState<RankingFilters>({
    ...DEFAULT_RANKING_FILTERS,
  });

  const rankedCandidates = useMemo(
    () => rankCandidates(candidates, role, filters),
    [candidates, role, filters],
  );

  function updateFilter<K extends keyof RankingFilters>(
    key: K,
    value: RankingFilters[K],
  ) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetFilters() {
    setFilters({ ...DEFAULT_RANKING_FILTERS });
  }

  const isLcaRole = role === "LCA";

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Ranked candidates
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Candidates ranked using the configured evidence-based scoring
              system.
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
            {rankedCandidates.length} of {candidates.length} candidates
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
              Search candidates and evidence
            </span>
            <input
              type="search"
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder="Candidate ID, Figma, LCA..."
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
              Classification
            </span>
            <select
              value={filters.label}
              onChange={(event) =>
                updateFilter(
                  "label",
                  event.target.value as RankingFilters["label"],
                )
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">All classifications</option>
              <option value="strong_match">Strong match</option>
              <option value="potential_match">Potential match</option>
              <option value="not_a_match">Not a match</option>
              <option value="needs_review">Needs review</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
              Evidence tier
            </span>
            <select
              value={filters.tier}
              onChange={(event) =>
                updateFilter(
                  "tier",
                  event.target.value as RankingFilters["tier"],
                )
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">All evidence tiers</option>
              <option value="demonstrated">Demonstrated</option>
              <option value="listed_only">Listed only</option>
              <option value="ambiguous">Ambiguous</option>
              <option value="missing">Missing</option>
              <option value="source_incomplete">Source incomplete</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
              Minimum score: {filters.minimumScore}
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={filters.minimumScore}
              onChange={(event) =>
                updateFilter("minimumScore", Number(event.target.value))
              }
              className="mt-3 w-full accent-slate-900"
            />
            <span className="flex justify-between text-xs text-slate-400">
              <span>0</span>
              <span>100</span>
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
              Sort by
            </span>
            <select
              value={filters.sortBy}
              onChange={(event) =>
                updateFilter(
                  "sortBy",
                  event.target.value as RankingFilters["sortBy"],
                )
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="score">Overall score</option>
              <option value="experience">
                {isLcaRole ? "LCA experience" : "Relevant experience"}
              </option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
              Sort direction
            </span>
            <select
              value={filters.sortDirection}
              onChange={(event) =>
                updateFilter(
                  "sortDirection",
                  event.target.value as RankingFilters["sortDirection"],
                )
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="desc">Highest first</option>
              <option value="asc">Lowest first</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={filters.hasWarnings}
              onChange={(event) =>
                updateFilter("hasWarnings", event.target.checked)
              }
              className="h-4 w-4 rounded border-slate-300 accent-slate-900"
            />
            Show candidates with warnings only
          </label>

          <button
            type="button"
            onClick={resetFilters}
            className="text-sm font-semibold text-blue-700 transition hover:text-blue-900"
          >
            Reset filters
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] border-collapse text-left">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Candidate</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Classification</th>
              <th className="px-4 py-3">Key evidence</th>
              <th className="px-4 py-3">
                {isLcaRole ? "LCA exp. (max)" : "Relevant exp."}
              </th>
              <th className="px-4 py-3">Review</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {rankedCandidates.map((candidate) => {
              const visibleEvidence = candidate.evidence
                .filter((item) => item.tier !== "missing")
                .slice(0, 3);

              return (
                <tr
                  key={candidate.candidate_id}
                  className="align-top transition hover:bg-slate-50"
                >
                  <td className="px-4 py-4 text-sm font-semibold tabular-nums text-slate-500">
                    #{candidate.rank}
                  </td>

                  <td className="px-4 py-4">
                    <span className="font-semibold text-slate-900">
                      {candidate.candidate_id}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <span className="text-base font-bold tabular-nums text-slate-900">
                      {candidate.score.toFixed(1)}
                    </span>
                    <span className="ml-1 text-xs text-slate-400">/100</span>
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${classificationStyles[candidate.classification]}`}
                    >
                      {classificationLabels[candidate.classification]}
                    </span>
                  </td>

                  <td className="max-w-sm px-4 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {visibleEvidence.length > 0 ? (
                        visibleEvidence.map((item) => (
                          <span
                            key={item.criterion_id}
                            title={`${item.criterion_label}: ${tierLabels[item.tier]}`}
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${tierStyles[item.tier]}`}
                          >
                            {item.criterion_label}
                            <span className="opacity-70">
                              · {tierLabels[item.tier]}
                            </span>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">
                          No matched evidence
                        </span>
                      )}

                      {candidate.evidence.filter(
                        (item) => item.tier !== "missing",
                      ).length > 3 && (
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-500">
                          +
                          {candidate.evidence.filter(
                            (item) => item.tier !== "missing",
                          ).length - 3}{" "}
                          more
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-4 text-sm tabular-nums text-slate-700">
                    {candidate.experienceMonths === null
                      ? "Not established"
                      : `${candidate.experienceMonths} months`}
                  </td>

                  <td className="px-4 py-4">
                    {candidate.hasWarnings ? (
                      <span
                        title={[
                          ...candidate.warnings.map((warning) => warning.code),
                          candidate.reviewRequired ? "Manual review required" : "",
                          candidate.sourceConfidence < 0.6
                            ? "Low source confidence"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(", ") || "Evidence needs review"}
                        className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700"
                      >
                        <span aria-hidden="true">⚠</span>
                        Review
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {rankedCandidates.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center"
                >
                  <p className="font-semibold text-slate-700">
                    No candidates match these filters
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Try changing your search or resetting the filters.
                  </p>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-3 text-sm font-semibold text-blue-700 hover:text-blue-900"
                  >
                    Clear all filters
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-slate-200 bg-slate-50 px-5 py-3">
        <p className="text-xs leading-5 text-slate-500">
          Scores support screening decisions and do not replace human review.
          {isLcaRole
            ? " LCA experience is shown as the maximum established duration."
            : " Role-specific UI/UX experience duration is not established in the current dataset."}
          {" "}Evidence chips summarize matched criteria; inspect source resumes
          through the authorized review process before making decisions.
        </p>
      </div>
    </section>
  );
}
