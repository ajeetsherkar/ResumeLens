"use client";

import type { ReviewQueueItem } from "@/lib/data/dashboard";

const reasonStyles: Record<ReviewQueueItem["reasons"][number]["category"], string> = {
  low_confidence: "border-amber-200 bg-amber-50 text-amber-800",
  source_incomplete: "border-orange-200 bg-orange-50 text-orange-800",
  ambiguous_evidence: "border-violet-200 bg-violet-50 text-violet-800",
  conflicting_dates: "border-rose-200 bg-rose-50 text-rose-800",
  extraction_error: "border-red-200 bg-red-50 text-red-800",
};

function formatStatus(status: string) {
  if (status === "empty") return "No readable text";
  if (status === "failed") return "Extraction failed";
  if (status === "partial") return "Partial extraction";
  return "Extraction successful";
}

export default function NeedsHumanReviewQueue({
  items,
  onSelectCandidate,
}: {
  items: ReviewQueueItem[];
  onSelectCandidate: (candidateId: string) => void;
}) {
  return (
    <section className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Human oversight
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">
            Needs human review
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Candidates are ordered by lowest source confidence first. Review
            the original evidence before making a hiring decision.
          </p>
        </div>

        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
          {items.length} {items.length === 1 ? "candidate" : "candidates"}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-5 text-center">
          <p className="text-sm font-semibold text-slate-700">
            No candidates currently require review
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Candidates flagged by the screening quality checks will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <article
              key={item.candidateId}
              className="rounded-lg border border-slate-200 p-4"
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">
                      Candidate {item.candidateId}
                    </h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {formatStatus(item.extractionStatus)}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-slate-600">
                    Source confidence:{" "}
                    <strong className="tabular-nums text-slate-900">
                      {(item.confidence * 100).toFixed(1)}%
                    </strong>
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {item.roles.length > 0
                      ? `Role evidence requiring attention: ${item.roles.join(", ")}`
                      : "General source-quality review"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectCandidate(item.candidateId)}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                >
                  Review candidate
                  <span aria-hidden="true" className="ml-2">→</span>
                </button>
              </div>

              {item.extractionMessage && (
                <div
                  role="alert"
                  className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3"
                >
                  <p className="text-sm font-semibold text-red-800">
                    File extraction needs attention
                  </p>
                  <p className="mt-1 text-sm leading-6 text-red-700">
                    {item.extractionMessage}
                  </p>
                </div>
              )}

              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Review reasons
                </p>

                <div className="mt-2 space-y-2">
                  {item.reasons.map((reason, index) => (
                    <div key={`${reason.category}-${index}`}>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${reasonStyles[reason.category]}`}
                      >
                        {reason.label}
                      </span>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {reason.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
