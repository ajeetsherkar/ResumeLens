"use client";

import { useState } from "react";
import Link from "next/link";
import type { DashboardData } from "@/lib/data/dashboard";

import RankedCandidates from "./ranked-candidates";

type Role = "LCA" | "UI/UX";

const jobProfiles = {
  LCA: {
    title: "LCA Consultant",
    subtitle: "Chennai based · Relocation required",
    location: "Chennai, India · On-site",
    experience: "2–3 years",
    requirements: [
      "Independently conduct at least 3 Life Cycle Assessment projects.",
      "Hands-on experience with GaBi or SimaPro.",
      "Knowledge of ISO 14040 and ISO 14044 standards.",
      "Build Life Cycle Inventory datasets and conduct LCA studies.",
      "Experience with EPD and environmental assessment is preferred.",
      "Environmental bachelor's or master's degree preferred.",
    ],
    additional: [
      "Full-time, on-site office commitment",
      "Extensive travel within India",
      "Minimum one-year commitment",
      "English communication",
    ],
  },
  "UI/UX": {
    title: "Growth For Impact UI/UX Internship",
    subtitle: "Fully remote · Worldwide team",
    location: "Remote",
    experience: "0–1 year",
    requirements: [
      "Design and improve growthforimpact.co, a LinkedIn-style platform for sustainability.",
      "Strong understanding of UI/UX principles and human-centered design.",
      "Proficiency in Figma and high-fidelity prototyping.",
      "Understanding of user psychology and user research.",
      "Strong visual design, aesthetic sense and attention to detail.",
      "Build website and job-board experiences using user feedback and testing.",
    ],
    additional: [
      "First design hire",
      "90-day goals: website revamp and job-board solution",
      "Recent graduates and career transitions accepted",
      "Stipend: ₹10,000–₹15,000/month",
    ],
  },
};

const classificationLabels = {
  strong_match: "Strong match",
  potential_match: "Potential match",
  not_a_match: "Not a match",
  needs_review: "Needs review",
};

const classificationStyles = {
  strong_match: "bg-emerald-50 text-emerald-700 border-emerald-200",
  potential_match: "bg-blue-50 text-blue-700 border-blue-200",
  not_a_match: "bg-slate-100 text-slate-600 border-slate-200",
  needs_review: "bg-amber-50 text-amber-700 border-amber-200",
};

function MetricCard({
  label,
  value,
  description,
  accent = "slate",
}: {
  label: string;
  value: number | string;
  description: string;
  accent?: "slate" | "blue" | "green" | "amber" | "red";
}) {
  const accentStyles = {
    slate: "border-slate-200",
    blue: "border-blue-200",
    green: "border-emerald-200",
    amber: "border-amber-200",
    red: "border-rose-200",
  };

  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm ${accentStyles[accent]}`}>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}

export default function Dashboard({
  data,
}: {
  data: DashboardData;
}) {
  const [activeRole, setActiveRole] = useState<Role>("LCA");
  const roleData = data.roles[activeRole];
  const job = jobProfiles[activeRole];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-lg font-bold text-white">
              R
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight">ResumeLens</p>
              <p className="text-xs text-slate-500">
                Explainable resume screening
              </p>
            </div>
          </Link>

          <nav className="flex items-center gap-5 text-sm font-medium">
            <span className="text-slate-900">Dashboard</span>
            <a
              href="/methodology"
              className="text-slate-500 transition hover:text-slate-900"
            >
              Methodology
            </a>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 sm:px-8">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
              HR screening workspace
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Candidate overview
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Compare candidates across roles, understand screening outcomes,
              and identify profiles that need human attention.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Dataset loaded · {data.processed} candidates
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Screening summary</h2>
              <p className="text-sm text-slate-500">
                Classification metrics for the selected role
              </p>
            </div>

            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
              {(["LCA", "UI/UX"] as Role[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setActiveRole(role)}
                  aria-pressed={activeRole === role}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    activeRole === role
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <MetricCard
              label="Processed"
              value={data.processed}
              description="Development candidates"
              accent="blue"
            />
            <MetricCard
              label="Strong match"
              value={roleData.counts.strong_match}
              description={classificationLabels.strong_match}
              accent="green"
            />
            <MetricCard
              label="Potential"
              value={roleData.counts.potential_match}
              description={classificationLabels.potential_match}
              accent="blue"
            />
            <MetricCard
              label="Not a match"
              value={roleData.counts.not_a_match}
              description={classificationLabels.not_a_match}
            />
            <MetricCard
              label="Needs review"
              value={data.needsReview}
              description="Unique candidates flagged"
              accent="amber"
            />
            <MetricCard
              label="Failed files"
              value={data.failedFiles}
              description="Failed or empty extraction"
              accent="red"
            />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Selected job profile
              </p>
              <h2 className="mt-1 text-xl font-bold">{job.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{job.subtitle}</p>
            </div>
            <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              {job.experience}
            </span>
          </div>

          <div className="mt-5 grid gap-6 md:grid-cols-[1fr_0.8fr]">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                Key requirements
              </h3>
              <ul className="mt-3 space-y-2">
                {job.requirements.map((requirement) => (
                  <li
                    key={requirement}
                    className="flex gap-2 text-sm leading-6 text-slate-600"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                    {requirement}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-800">
                Role details
              </h3>
              <p className="mt-3 text-sm text-slate-600">{job.location}</p>
              <ul className="mt-3 space-y-2">
                {job.additional.map((detail) => (
                  <li key={detail} className="text-sm text-slate-600">
                    · {detail}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">
              Average candidate score
            </p>
            <p className="mt-2 text-3xl font-bold">
              {roleData.averageScore}
              <span className="ml-1 text-base font-medium text-slate-400">
                / 100
              </span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {activeRole} · Across all processed candidates
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">
              Classification distribution
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(
                Object.entries(roleData.counts) as [
                  keyof typeof classificationLabels,
                  number,
                ][]
              ).map(([label, count]) => (
                <span
                  key={label}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${classificationStyles[label]}`}
                >
                  {classificationLabels[label]} · {count}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Labels reflect the configured Day 2 classification rules.
            </p>
          </div>
        </section>

        <RankedCandidates candidates={data.candidates} role={activeRole} />


        <footer className="border-t border-slate-200 py-5 text-center text-xs text-slate-400">
          ResumeLens · Evidence-based candidate screening · Human review remains
          essential.
        </footer>
      </div>
    </main>
  );
}
