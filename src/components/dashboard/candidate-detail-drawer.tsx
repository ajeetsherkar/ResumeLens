"use client";

import { useEffect, useState } from "react";
import type {
  CandidateDetail,
  CandidateWarning,
  CandidateRoleDetail,
} from "@/lib/data/candidate-detail";
import { buildHighlightSegments } from "@/lib/data/source-highlights";

const classificationLabels = {
  strong_match: "Strong match",
  potential_match: "Potential match",
  not_a_match: "Not a match",
  needs_review: "Needs review",
} as const;

const classificationStyles = {
  strong_match: "border-emerald-200 bg-emerald-50 text-emerald-700",
  potential_match: "border-blue-200 bg-blue-50 text-blue-700",
  not_a_match: "border-slate-200 bg-slate-100 text-slate-600",
  needs_review: "border-amber-200 bg-amber-50 text-amber-700",
} as const;

const tierLabels = {
  demonstrated: "Demonstrated",
  listed_only: "Listed only",
  ambiguous: "Ambiguous",
  missing: "Missing",
  source_incomplete: "Source incomplete",
} as const;

const tierStyles = {
  demonstrated: "bg-emerald-50 text-emerald-700",
  listed_only: "bg-blue-50 text-blue-700",
  ambiguous: "bg-amber-50 text-amber-700",
  missing: "bg-slate-100 text-slate-600",
  source_incomplete: "bg-rose-50 text-rose-700",
} as const;

const warningLabels: Record<CandidateWarning["type"], string> = {
  extraction_error: "Extraction error",
  source_incomplete: "Source incomplete",
  ambiguous_evidence: "Ambiguous evidence",
  other: "Other warning",
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-slate-200 px-5 py-5 sm:px-6">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {description && (
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
      {children}
    </p>
  );
}

function ClassificationCard({
  detail,
}: {
  detail: CandidateRoleDetail;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {detail.role}
        </span>
        <span
          className={`rounded-full border px-2 py-1 text-xs font-semibold ${classificationStyles[detail.classification]}`}
        >
          {classificationLabels[detail.classification]}
        </span>
      </div>

      <p className="mt-3 text-3xl font-bold tabular-nums text-slate-900">
        {detail.score.toFixed(1)}
        <span className="ml-1 text-base font-medium text-slate-400">
          / {detail.maxScore}
        </span>
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-600">
        {detail.classificationExplanation}
      </p>
    </div>
  );
}

function SourceEvidenceViewer({ detail }: { detail: CandidateDetail }) {
  const allEvidence = (["LCA", "UI/UX"] as const).flatMap((role) =>
    detail.roles[role].criteria.flatMap((criterion) => criterion.evidence),
  );

  const validEvidence = allEvidence.filter(
    (item) =>
      item.verified &&
      item.start !== null &&
      item.end !== null &&
      item.end > item.start,
  );

  const segments = detail.source.available
    ? buildHighlightSegments(
        detail.source.text,
        validEvidence.map((item) => ({
          id: item.id,
          start: item.start!,
          end: item.end!,
          text: item.text,
          criterionId: item.criterionId,
          criterionLabel: item.criterionLabel,
          role: item.role,
          verified: item.verified,
        })),
      )
    : [];

  const evidenceById = new Map(
    validEvidence.map((item) => [item.id, item]),
  );
  const anchorIds = new Set<string>();

  return (
    <Section
      title="Resume source and verified evidence"
      description="Highlighted passages are verified evidence linked to screening criteria. Use the links in each criterion to locate its passage."
    >
      {!detail.source.available ? (
        <EmptyState>{detail.source.message}</EmptyState>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-amber-200 ring-1 ring-amber-300" />
              Verified evidence
            </span>
            <span>{validEvidence.length} verified items with offsets</span>
          </div>

          {segments.length === 0 ? (
            <EmptyState>
              Extracted resume text is available, but no verified evidence
              passages with matching source offsets are available to highlight.
            </EmptyState>
          ) : (
            <div className="max-h-[32rem] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
              <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-6 text-slate-700">
                {segments.map((segment, index) => {
                  const previousEnd =
                    index === 0 ? 0 : segments[index - 1].end;
                  const before = detail.source.text.slice(
                    previousEnd,
                    segment.start,
                  );

                  const newAnchors = segment.evidenceIds.filter((id) => {
                    if (anchorIds.has(id)) return false;
                    anchorIds.add(id);
                    return true;
                  });

                  const descriptions = segment.evidenceIds
                    .map((id) => evidenceById.get(id))
                    .filter((item) => item !== undefined)
                    .map((item) => `${item.role}: ${item.criterionLabel}`);

                  return (
                    <span key={`${segment.start}-${segment.end}-${index}`}>
                      {before}
                      <mark
                        className="rounded-sm bg-amber-200 px-0.5 text-slate-900 ring-1 ring-amber-300"
                        title={descriptions.join(" · ")}
                      >
                        {newAnchors.map((id) => (
                          <span
                            key={id}
                            id={`source-evidence-${id}`}
                            className="scroll-mt-4"
                          />
                        ))}
                        {segment.text}
                      </mark>
                    </span>
                  );
                })}
                {detail.source.text.slice(
                  segments.length > 0
                    ? segments[segments.length - 1].end
                    : 0,
                )}
              </pre>
            </div>
          )}

          <p className="text-xs leading-5 text-slate-500">
            Only verified passages with valid offsets and matching source text
            are highlighted. Unhighlighted text was not linked to a verified
            scoring snippet; it is not proof that a skill is absent.
          </p>
        </div>
      )}
    </Section>
  );
}

function RoleCriteria({
  detail,
  sourceAvailable,
}: {
  detail: CandidateRoleDetail;
  sourceAvailable: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-slate-900">
          {detail.role} criterion breakdown
        </h4>
        <span className="text-xs text-slate-500">
          Total: {detail.score.toFixed(1)} / {detail.maxScore}
        </span>
      </div>

      <p className="text-xs leading-5 text-slate-500">
        Weight is the maximum available points. Credit is the evidence factor
        applied to that weight. Points are the actual contribution to the
        overall score.
      </p>

      {detail.criteria.map((criterion) => (
        <article
          key={criterion.criterionId}
          className="rounded-lg border border-slate-200 p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h5 className="text-sm font-semibold capitalize text-slate-900">
                {criterion.label}
              </h5>
              <p className="mt-1 text-xs text-slate-500">
                Weight: {criterion.weight} points
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${tierStyles[criterion.tier]}`}
            >
              {tierLabels[criterion.tier]}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-md bg-slate-50 p-2">
              <p className="text-xs text-slate-500">Credit</p>
              <p className="mt-1 text-sm font-bold tabular-nums text-slate-900">
                {(criterion.credit * 100).toFixed(0)}%
              </p>
            </div>
            <div className="rounded-md bg-slate-50 p-2">
              <p className="text-xs text-slate-500">Points</p>
              <p className="mt-1 text-sm font-bold tabular-nums text-slate-900">
                {criterion.points.toFixed(1)} / {criterion.weight}
              </p>
            </div>
            <div className="rounded-md bg-slate-50 p-2">
              <p className="text-xs text-slate-500">Evidence items</p>
              <p className="mt-1 text-sm font-bold tabular-nums text-slate-900">
                {criterion.evidence.length}
              </p>
            </div>
          </div>

          <p className="mt-3 text-xs leading-5 text-slate-600">
            {criterion.explanation}
          </p>

          {criterion.evidence.length > 0 ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold text-slate-700">
                Resume evidence
              </p>
              {criterion.evidence.map((item, index) => (
                <div
                  key={`${criterion.criterionId}-${index}`}
                  className="rounded-md border border-slate-100 bg-slate-50 p-3"
                >
                  <p className="text-xs leading-5 text-slate-700">
                    “{item.text}”
                  </p>
                  {item.matchedText && item.matchedText !== item.text && (
                    <p className="mt-2 text-xs text-slate-500">
                      Matched text: {item.matchedText}
                    </p>
                  )}
                  {sourceAvailable &&
                    item.verified &&
                    item.start !== null &&
                    item.end !== null && (
                      <a
                        href={`#source-evidence-${item.id}`}
                        className="mt-2 inline-flex text-xs font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900"
                      >
                        View in source
                      </a>
                    )}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span>Section: {item.section}</span>
                    <span>·</span>
                    <span>
                      {item.verified ? "Verified evidence" : "Not independently verified"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-500">
              No verified resume evidence snippet is available for this criterion.
            </p>
          )}
        </article>
      ))}
    </div>
  );
}

function CandidateContent({ detail }: { detail: CandidateDetail }) {
  return (
    <>
      <Section
        title="Assessment overview"
        description="Both role assessments are shown for comparison. Classification thresholds are provisional."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <ClassificationCard detail={detail.roles.LCA} />
          <ClassificationCard detail={detail.roles["UI/UX"]} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Source confidence</p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {(detail.sourceConfidence * 100).toFixed(0)}%
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Extraction/source confidence indicator, not candidate suitability.
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Extraction quality</p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {(detail.quality.confidence * 100).toFixed(0)}%
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Quality confidence reported by the extraction pipeline.
            </p>
          </div>
        </div>

        {(detail.reviewRequired || detail.quality.reviewRequired) && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
            Manual review is flagged by the screening or extraction pipeline.
          </p>
        )}
      </Section>

      <SourceEvidenceViewer detail={detail} />
      <Section
        title="Extracted profile"
        description="Information below is extracted from the candidate's resume. Missing information is not assumed."
      >
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-700">
              Education
            </p>
            {detail.education.length ? (
              <div className="space-y-2">
                {detail.education.map((item, index) => (
                  <div key={index} className="rounded-lg bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {item.qualification
                        ? item.qualification
                        : /^\\s*\\d+(?:\\.\\d+)?\\s*%\\s*$/.test(item.originalText)
                          ? `Extracted value: ${item.originalText}`
                          : item.originalText}
                    </p>
                    {item.fieldOfStudy && (
                      <p className="mt-1 text-xs text-slate-600">
                        Field: {item.fieldOfStudy}
                      </p>
                    )}
                    {item.institution && (
                      <p className="mt-1 text-xs text-slate-600">
                        {item.institution}
                      </p>
                    )}
                    <p className="mt-1 text-xs capitalize text-slate-500">
                      Academic level: {item.academicLevel.replaceAll("_", " ")}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState>No education information was extracted.</EmptyState>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-slate-700">
              Experience
            </p>
            <div className="mb-2 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Total experience</p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {detail.experience.totalMonths === null
                    ? "Not established"
                    : `${detail.experience.totalMonths} months`}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">LCA experience</p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {detail.experience.lcaMonths === null
                    ? "Not established"
                    : `${detail.experience.lcaMonths} months`}
                </p>
              </div>
            </div>
            <p className="mb-2 text-xs leading-5 text-slate-500">
              Month estimates use the pipeline convention:{" "}
              {detail.experience.monthCountingConvention}.
            </p>

            {detail.experience.roles.length ? (
              <div className="space-y-2">
                {detail.experience.roles.map((role, index) => (
                  <div key={index} className="rounded-lg border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {role.title}
                    </p>
                    {role.employer && (
                      <p className="mt-1 text-xs text-slate-600">
                        {role.employer}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-slate-500">
                      {role.dateText || "Dates not established"}
                    </p>
                    {role.dateWarning && (
                      <p className="mt-1 text-xs capitalize text-amber-700">
                        {role.dateWarning.replaceAll("_", " ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState>No experience entries were extracted.</EmptyState>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-slate-700">Skills</p>
            {detail.skills.length ? (
              <div className="flex flex-wrap gap-2">
                {detail.skills.map((skill, index) => (
                  <span
                    key={`${skill.name}-${index}`}
                    title={`${skill.originalText} · ${skill.section}`}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                  >
                    {skill.name}
                  </span>
                ))}
              </div>
            ) : (
              <EmptyState>No skills were extracted.</EmptyState>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-slate-700">Projects</p>
            {detail.projects.length ? (
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                {detail.projects.map((project, index) => (
                  <li key={index}>{project}</li>
                ))}
              </ul>
            ) : (
              <EmptyState>
                No project information was extracted from the available profiles.
              </EmptyState>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-slate-700">
              Certifications
            </p>
            {detail.certifications.length ? (
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                {detail.certifications.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : (
              <EmptyState>
                No certification information was extracted from the available profiles.
              </EmptyState>
            )}
          </div>
        </div>
      </Section>

      <Section
        title="Criterion-level score explanations"
        description="Each criterion shows its configured weight, evidence credit, awarded points, and the explanation generated by the scoring engine."
      >
        <div className="space-y-6">
          <RoleCriteria
            detail={detail.roles.LCA}
            sourceAvailable={detail.source.available}
          />
          <RoleCriteria
            detail={detail.roles["UI/UX"]}
            sourceAvailable={detail.source.available}
          />
        </div>
      </Section>

      <Section
        title="Eligibility"
        description="Eligibility fields are informational and must not be inferred from unrelated resume content."
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Relocation</p>
            <p className="mt-1 text-sm font-semibold capitalize text-slate-900">
              {detail.eligibility.relocation.replaceAll("_", " ")}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Full-time availability</p>
            <p className="mt-1 text-sm font-semibold capitalize text-slate-900">
              {detail.eligibility.fullTimeAvailability.replaceAll("_", " ")}
            </p>
          </div>
        </div>
      </Section>

      <Section
        title="Source quality and warnings"
        description="Warnings are grouped by the issue type reported by the extraction and quality pipeline."
      >
        {detail.warnings.length ? (
          <div className="space-y-2">
            {detail.warnings.map((warning, index) => (
              <div
                key={`${warning.code}-${index}`}
                className="rounded-lg border border-slate-200 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                    {warningLabels[warning.type]}
                  </span>
                  <span className="text-xs text-slate-500">{warning.code}</span>
                </div>
                <p className="mt-2 text-sm leading-5 text-slate-700">
                  {warning.message}
                </p>
                {warning.section && (
                  <p className="mt-1 text-xs text-slate-500">
                    Section: {warning.section}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>No source-quality warnings were reported.</EmptyState>
        )}
      </Section>

      <Section title="Source document">
        <EmptyState>{detail.sourceDocument.message}</EmptyState>
      </Section>

      <Section title="Manual overrides">
        <EmptyState>{detail.overrides.message}</EmptyState>
      </Section>
    </>
  );
}

export default function CandidateDetailDrawer({
  candidateId,
  onClose,
}: {
  candidateId: string | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!candidateId) {
      return;
    }

    const controller = new AbortController();

    async function loadCandidate() {
      setLoading(true);
      setDetail(null);
      setError(null);

      try {
        const response = await fetch(
          `/api/candidates/${encodeURIComponent(candidateId!)}`,
          { signal: controller.signal, cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "Candidate details were not found."
              : "Unable to load candidate details.",
          );
        }

        const result = (await response.json()) as CandidateDetail;
        setDetail(result);
      } catch (caught) {
        if (caught instanceof Error && caught.name === "AbortError") return;
        setError(
          caught instanceof Error
            ? caught.message
            : "An unexpected error occurred.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadCandidate();

    return () => controller.abort();
  }, [candidateId]);

  useEffect(() => {
    if (!candidateId) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [candidateId, onClose]);

  if (!candidateId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/40"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="candidate-detail-title"
        className="flex h-full w-full max-w-5xl flex-col bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Candidate details
            </p>
            <h2
              id="candidate-detail-title"
              className="mt-1 text-xl font-bold text-slate-900"
            >
              Candidate #{candidateId}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close candidate details"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Close
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && (
            <div className="p-8 text-center text-sm text-slate-500">
              Loading candidate details…
            </div>
          )}

          {error && (
            <div className="m-5 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          )}

          {detail && <CandidateContent detail={detail} />}
        </div>
      </aside>
    </div>
  );
}
