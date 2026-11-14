"use client";

import { useState } from "react";
import type { UploadProcessingResult } from "@/lib/upload-processing";
import {
  rankCandidates,
  type RankingCandidate,
  type RankingRole,
} from "@/lib/ranking";

const roles: RankingRole[] = ["LCA", "UI/UX"];

const classificationLabels = {
  strong_match: "Strong match",
  potential_match: "Potential match",
  not_a_match: "Not a match",
  needs_review: "Needs review",
};

export default function ResumeUpload({
  candidates,
}: {
  candidates: RankingCandidate[];
}) {
  const [result, setResult] = useState<UploadProcessingResult | null>(null);
  const [candidateId, setCandidateId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeRole, setActiveRole] = useState<RankingRole>("LCA");
  const [editedText, setEditedText] = useState("");

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to process this resume.");
      }

      setResult(payload as UploadProcessingResult);
      setEditedText(payload.profile.display_text);
      setCandidateId(`UPLOAD-${crypto.randomUUID()}`);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to process this resume.",
      );
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  }

  async function handleRescore() {
    if (!result || !editedText.trim()) {
      setError("Please enter resume text before re-scoring.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: editedText,
          filename: result.filename,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to re-score corrected text.");
      }

      setResult(payload as UploadProcessingResult);
    } catch (rescoreError) {
      setError(
        rescoreError instanceof Error
          ? rescoreError.message
          : "Unable to re-score corrected text.",
      );
    } finally {
      setLoading(false);
    }
  }

  const uploadedCandidate: RankingCandidate | null = result
    ? {
        candidate_id: candidateId,
        source_confidence: result.profile.quality.confidence,
        review_required: result.profile.quality.review_required,
        experience: {
          total_experience_months_max:
            result.profile.experience.total_experience_months_max,
          lca_experience_months_max:
            result.profile.experience.lca_experience_months_max,
        },
        warnings: result.profile.warnings,
        role_results: {
          LCA: {
            score: result.role_results.LCA.score,
            classification: result.role_results.LCA.classification,
            evidence: result.role_results.LCA.evidence.map((item) => ({
              criterion_id: item.criterion_id,
              criterion_label: item.criterion_label,
              role: "LCA",
              tier: item.tier,
              matched_aliases: item.matched_aliases,
            })),
          },
          "UI/UX": {
            score: result.role_results["UI/UX"].score,
            classification: result.role_results["UI/UX"].classification,
            evidence: result.role_results["UI/UX"].evidence.map((item) => ({
              criterion_id: item.criterion_id,
              criterion_label: item.criterion_label,
              role: "UI/UX",
              tier: item.tier,
              matched_aliases: item.matched_aliases,
            })),
          },
        },
      }
    : null;

  const rankedCandidate =
    uploadedCandidate && result
      ? rankCandidates(
          [...candidates, uploadedCandidate],
          activeRole,
        ).find((candidate) => candidate.candidate_id === candidateId)
      : null;

  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
          Session 1 · New candidate
        </p>
        <h2 className="mt-1 text-xl font-bold">Upload and review a resume</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Upload a DOCX file to extract its profile, inspect evidence, and
          compare its hypothetical position against the existing candidate pool.
        </p>
      </div>

      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5">
        <label
          htmlFor="resume-upload"
          className="block text-sm font-semibold text-slate-800"
        >
          Select a resume (.docx)
        </label>
        <input
          id="resume-upload"
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleUpload}
          disabled={loading}
          className="mt-3 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-slate-700 disabled:opacity-50"
        />
        <p className="mt-2 text-xs text-slate-500">
          Maximum file size: 5 MB. Uploaded files are processed for this
          session and are not added to the stored dataset.
        </p>
      </div>

      {loading && (
        <p role="status" className="text-sm font-medium text-blue-700">
          Extracting and evaluating resume...
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
        >
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900">
                {result.filename}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Extraction confidence:{" "}
                {Math.round(result.profile.quality.confidence * 100)}%
              </p>
            </div>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
              Session only
            </span>
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-800">
              Extraction review
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">Total experience</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {result.profile.experience.total_experience_months_max ??
                    "Unknown"}{" "}
                  {typeof result.profile.experience.total_experience_months_max ===
                  "number"
                    ? "months"
                    : ""}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">LCA experience</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {result.profile.experience.lca_experience_months_max ??
                    "Unknown"}{" "}
                  {typeof result.profile.experience.lca_experience_months_max ===
                  "number"
                    ? "months"
                    : ""}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Human review</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {result.profile.quality.review_required ? "Required" : "Not flagged"}
                </p>
              </div>
            </div>

            {result.profile.warnings.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {result.profile.warnings.map((warning, index) => (
                  <li
                    key={`${warning.code}-${index}`}
                    className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800"
                  >
                    <span className="font-semibold">{warning.code}:</span>{" "}
                    {warning.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-emerald-700">
                No extraction warnings detected.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-800">
              Review and correct extracted text
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Make corrections before re-scoring. These edits apply only to
              this browser session and are not saved to the dataset.
            </p>
            <textarea
              value={editedText}
              onChange={(event) => setEditedText(event.target.value)}
              rows={12}
              maxLength={100000}
              disabled={loading}
              aria-label="Editable extracted resume text"
              className="mt-3 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm leading-6 text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {editedText.length.toLocaleString()} / 100,000 characters
              </p>
              <button
                type="button"
                onClick={handleRescore}
                disabled={loading || !editedText.trim()}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Re-scoring..." : "Re-score corrected profile"}
              </button>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-900">
                Hypothetical ranking
              </h3>
              <div className="inline-flex rounded-lg border border-slate-200 p-1">
                {roles.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setActiveRole(role)}
                    aria-pressed={activeRole === role}
                    className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                      activeRole === role
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {rankedCandidate && (
              <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-medium text-blue-900">
                  Position among {candidates.length + 1} candidates
                </p>
                <p className="mt-1 text-3xl font-bold text-blue-950">
                  #{rankedCandidate.rank}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold">
                    Score: {rankedCandidate.score.toFixed(2)}/100
                  </span>
                  <span>·</span>
                  <span>{classificationLabels[rankedCandidate.classification]}</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-blue-800">
                  This is a hypothetical score-based position, not a hiring
                  decision. Existing candidates remain unchanged.
                </p>
              </div>
            )}
          </div>

          <div>
            <h3 className="font-semibold text-slate-900">
              {activeRole} score breakdown
            </h3>
            <div className="mt-3 space-y-3">
              {result.role_results[activeRole].score.criteria.map((criterion) => (
                <div
                  key={criterion.criterion_id}
                  className="rounded-lg border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">
                      {criterion.criterion_id}
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      {criterion.score.toFixed(2)} / {criterion.max_score}
                    </p>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    {criterion.explanation}
                  </p>
                  {criterion.evidence.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {criterion.evidence.map((item, index) => (
                        <li
                          key={`${item.start_offset}-${index}`}
                          className="rounded bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700"
                        >
                          <span className="font-semibold">
                            {item.section} · {item.tier}
                          </span>
                          <p className="mt-1">{item.snippet}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
