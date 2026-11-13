import Link from "next/link";

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          ← Back to dashboard
        </Link>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
            ResumeLens
          </p>
          <h1 className="mt-2 text-3xl font-bold">Screening methodology</h1>
          <p className="mt-3 leading-7 text-slate-600">
            This page will document the evidence extraction process, criterion
            weights, evidence tiers, scoring calculations, classification
            thresholds, and human review rules.
          </p>

          <div className="mt-7 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
            <p className="font-semibold text-slate-800">
              Methodology documentation
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Detailed methodology documentation is planned for a subsequent
              development session. Scores are decision-support signals and
              should not replace human assessment.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
