import Link from "next/link";

const lcaCriteria = [
  ["LCA methodology", 20],
  ["Life Cycle Inventory (LCI)", 10],
  ["LCA standards", 15],
  ["LCA software", 15],
  ["Environmental Product Declaration (EPD)", 10],
  ["Impact assessment", 10],
  ["Carbon footprint", 10],
  ["Environmental assessment", 10],
] as const;

const uiuxCriteria = [
  ["Design tools", 10],
  ["Wireframing", 8],
  ["Prototyping", 10],
  ["Interaction design", 10],
  ["Visual design", 10],
  ["User research", 15],
  ["Usability testing", 12],
  ["Design methods", 10],
  ["Research artifacts", 8],
  ["Design systems", 7],
] as const;

const evidenceTiers = [
  ["Demonstrated", "1.00", "Evidence in experience or project content."],
  ["Listed only", "0.50", "Term appears in skills or certification lists."],
  ["Ambiguous", "0.25", "Vague evidence or evidence only in summary or education."],
  ["Missing", "0.00", "No matching evidence found."],
  ["Source incomplete", "0.00", "Damaged source prevents reliable assessment."],
] as const;

const qualityIssues = [
  ["Extraction error", "Extraction failed, was insufficient, or methods disagreed."],
  ["Source incomplete", "Missing, truncated, or incomplete source information."],
  ["Ambiguous evidence", "A reference or date cannot be interpreted confidently."],
  ["Privacy flag", "Email or phone-like information was detected for redaction."],
] as const;

function Scorecard({
  title,
  criteria,
}: {
  title: string;
  criteria: ReadonlyArray<readonly [string, number]>;
}) {
  return (
    <section className="rounded-xl border border-slate-200 p-5">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <div className="mt-4 divide-y divide-slate-100">
        {criteria.map(([name, weight]) => (
          <div key={name} className="flex items-center justify-between gap-4 py-2 text-sm">
            <span className="text-slate-700">{name}</span>
            <span className="font-semibold tabular-nums text-slate-900">{weight}</span>
          </div>
        ))}
        <div className="flex justify-between pt-3 text-sm font-bold text-slate-900">
          <span>Total</span>
          <span>100</span>
        </div>
      </div>
    </section>
  );
}

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm font-medium text-blue-700 hover:underline">
          ← Back to dashboard
        </Link>

        <header className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
            ResumeLens
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Screening methodology
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            How resumes are extracted, how evidence is evaluated, and how
            role-specific scores and review classifications are calculated.
          </p>
          <p className="mt-4 rounded-lg bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            ResumeLens is an explainable screening prototype for human review.
            Scores are decision-support signals, not hiring decisions or
            validated predictions of job performance.
          </p>
        </header>

        <div className="mt-6 space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">1. Document extraction</h2>
            <p className="mt-3 leading-7 text-slate-600">
              DOCX text is extracted using Mammoth and a raw DOCX XML fallback.
              The XML fallback reads document, header, and footer content.
              Extracted text is normalized for whitespace and the two outputs
              are compared. A disagreement creates a warning requiring review.
            </p>
            <p className="mt-3 leading-7 text-slate-600">
              Evidence snippets retain their source section and text offsets
              so reviewers can trace matching evidence back to extracted text.
              Original resume wording is not silently reconstructed.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">2. Data-quality assessment</h2>
            <p className="mt-3 leading-7 text-slate-600">
              Eight deterministic rules (R1–R8) assess extraction quality,
              incomplete ISO references, truncated text, role dates, required
              sections, invalid dates, privacy patterns, and extraction
              disagreement.
            </p>
            <div className="mt-4 divide-y divide-slate-100">
              {qualityIssues.map(([name, description]) => (
                <div key={name} className="py-3">
                  <p className="font-semibold text-slate-800">{name}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Review is required when R1, R6, or R8 fires. Source confidence is
              calculated as 1 minus the fired rule weights divided by the sum
              of all rule weights. These weights are provisional; confidence
              is not a probability of candidate suitability.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">3. Evidence tiers</h2>
            <p className="mt-3 leading-7 text-slate-600">
              Role-specific evidence dictionaries identify matching terms.
              The strength of evidence depends on where the evidence appears
              and whether the source can be assessed reliably.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-4">Tier</th>
                    <th className="py-2 pr-4">Credit</th>
                    <th className="py-2">Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  {evidenceTiers.map(([tier, credit, meaning]) => (
                    <tr key={tier} className="border-b border-slate-100">
                      <td className="py-3 pr-4 font-medium">{tier}</td>
                      <td className="py-3 pr-4 tabular-nums">{credit}</td>
                      <td className="py-3 text-slate-600">{meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Experience and project content can establish demonstrated
              evidence. Skills and certifications are listed-only. Summary
              and education content is ambiguous unless stronger evidence is
              available elsewhere.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">4. Role scorecards</h2>
            <p className="mt-3 leading-7 text-slate-600">
              Each role has a separate scorecard with criterion weights
              totalling 100 points.
            </p>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <Scorecard title="LCA Consultant" criteria={lcaCriteria} />
              <Scorecard title="Growth For Impact UI/UX Internship" criteria={uiuxCriteria} />
            </div>
            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <h3 className="font-semibold">Score calculation</h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Criterion score = criterion weight × evidence-tier credit.
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Total score = (sum of earned criterion scores ÷ total possible
                criterion weight) × 100. Scores are rounded to two decimal
                places.
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                The scoring function uses verified evidence and configured
                criterion weights. Candidate names, institutions, and
                eligibility flags are excluded from criterion scoring.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">5. Classification and review</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-4">Condition</th>
                    <th className="py-2">Classification</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-3 pr-4">Score ≥ 75</td>
                    <td className="py-3 font-medium">Strong match</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-3 pr-4">Score ≥ 50 and below 75</td>
                    <td className="py-3 font-medium">Potential match</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4">Score below 50</td>
                    <td className="py-3 font-medium">Not a match</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 leading-7 text-slate-600">
              Review takes precedence over score bands. A candidate is marked
              for review when a review flag is present or source confidence
              is below 0.60. A classification is not an automatic rejection
              or selection decision.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">6. Experience convention</h2>
            <p className="mt-3 leading-7 text-slate-600">
              Experience uses elapsed calendar months derived from resume date
              ranges. Overlapping employment and internship periods are merged
              before total experience is summed. Project periods are excluded
              from total employment experience.
            </p>
            <p className="mt-3 leading-7 text-slate-600">
              LCA experience is calculated separately and requires explicit
              LCA/LCI-related evidence in a role description and a valid date
              range. Overlapping LCA periods are merged too.
            </p>
            <p className="mt-3 leading-7 text-slate-600">
              The system does not currently establish a dedicated UI/UX
              experience-month value, so it does not substitute general
              experience for UI/UX experience.
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              These are maximum elapsed calendar-month estimates, not verified
              full-time working months, hours, or continuous employment.
              Missing, invalid, ambiguous, and duration-only dates are flagged
              rather than silently converted into precise totals.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">7. Evaluation snapshot</h2>
            <p className="mt-3 leading-7 text-slate-600">
              The manual evaluation contains 15 labelled resumes: 8 calibration
              and 7 held-out. Labels were assigned by one annotator reviewing
              original resumes without using classifier predictions or scores.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-4">Measure</th>
                    <th className="py-2 pr-4">Calibration</th>
                    <th className="py-2">Held-out</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-3 pr-4">Accuracy</td>
                    <td className="py-3 pr-4">37.5% (3/8)</td>
                    <td className="py-3">57.1% (4/7)</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4">Macro-F1</td>
                    <td className="py-3 pr-4">0.481</td>
                    <td className="py-3">0.571</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              The held-out set contains five UI/UX labels and two Neither
              labels, with no LCA-labelled examples. Held-out LCA performance
              cannot be evaluated. Thresholds 50–70 produced identical
              calibration predictions, so 50 is a provisional fallback,
              not an empirically established optimum.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">8. Limitations and human oversight</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-7 text-slate-600">
              <li>The evaluation sample is small and uses one annotator.</li>
              <li>The held-out sample has no LCA-labelled examples.</li>
              <li>Resume wording, formatting, extraction quality, and missing information can affect evidence detection.</li>
              <li>Keyword matching may miss equivalent terminology or context.</li>
              <li>Listed skills do not demonstrate practical ability.</li>
              <li>Quality-rule weights and classification thresholds are provisional.</li>
              <li>The evaluation does not establish fairness or predictive validity across demographic groups.</li>
            </ul>
            <p className="mt-4 leading-7 text-slate-600">
              Recruiters should inspect source evidence, consider missing or
              ambiguous information, and apply consistent human judgment.
              ResumeLens should not be the sole basis for hiring or rejection.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">9. Documentation and reproducibility</h2>
            <p className="mt-3 leading-7 text-slate-600">
              The methodology and cleaning log are maintained with the project
              source. Evaluation details are available in the repository under
              <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-sm">eval/</code>.
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              The dashboard currently displays a 2–3 years experience
              requirement. The repository materials reviewed do not establish
              the original source of a separate 4–6 years requirement. Any
              discrepancy remains unverified until checked against the
              original job description.
            </p>
            <div className="mt-5 flex flex-wrap gap-4 text-sm font-medium">
              <Link href="/" className="text-blue-700 hover:underline">
                Return to candidate dashboard
              </Link>
            </div>
          </section>
        </div>

        <footer className="py-8 text-center text-xs text-slate-500">
          ResumeLens · Explainable decision support · Human review required
        </footer>
      </div>
    </main>
  );
}
