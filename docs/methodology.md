# ResumeLens — Screening Methodology

## 1. Purpose and scope

ResumeLens is an explainable resume-screening prototype for two roles:

- LCA Consultant
- Growth For Impact UI/UX Internship

It extracts resume information, identifies role-related evidence, calculates criterion-weighted scores, and presents results for human review.

A score is a decision-support signal, not a hiring decision or a validated prediction of job performance. Recruiters must review the original resume and supporting evidence before making decisions.

## 2. Document extraction and normalization

### DOCX extraction

ResumeLens extracts text from DOCX documents using Mammoth. It also reads text from the underlying DOCX XML as a fallback.

The XML fallback examines the document, header, and footer XML parts. Extracted text is normalized for whitespace. The Mammoth and XML-derived text are compared; a mismatch generates an extraction warning requiring review.

The original source text and evidence offsets are retained so that displayed evidence can be traced back to the extracted resume text.

### Normalization

The extraction pipeline identifies resume sections, role headings, date ranges, skills, education, and project information. Normalization does not establish that a candidate possesses a skill merely because a related term appears in a resume.

Where source text is incomplete or ambiguous, ResumeLens flags uncertainty instead of reconstructing missing information.

## 3. Data-quality vocabulary

The quality assessment uses four issue types:

| Issue type | Meaning |
|---|---|
| extraction_error | Text extraction failed, was insufficient, or differed between extraction methods |
| source_incomplete | The source contains missing, truncated, or incomplete information |
| ambiguous_evidence | A reference or date cannot be interpreted confidently |
| privacy_flag | Email or phone-like information was detected and should be redacted from displayed text |

Eight deterministic rules, R1–R8, evaluate extraction quality, ISO references, truncated text, role dates, required sections, invalid dates, contact information, and extraction disagreement.

A review is required when R1, R6, or R8 fires.

Source confidence is calculated as:

1 − (sum of weights for fired quality rules / sum of all configured quality-rule weights)

The quality-rule weights are provisional. This confidence value is a source-quality indicator, not a probability that a candidate is suitable for a role.

## 4. Evidence verification and tiers

Evidence is matched against a role-specific evidence dictionary. Matching snippets retain their source section and text offsets. The implementation verifies that a snippet exists at the recorded location in the extracted source text.

Evidence is assigned one of five tiers:

| Evidence tier | Credit | Interpretation |
|---|---:|---|
| demonstrated | 1.00 | Matching evidence appears in experience or project content |
| listed_only | 0.50 | Matching term appears in a skills or certification list |
| ambiguous | 0.25 | Evidence is vague or appears only in summary or education content |
| missing | 0.00 | No matching evidence was found in inspected sections |
| source_incomplete | 0.00 | Source extraction is damaged or incomplete, preventing reliable assessment |

Experience and project sections can establish demonstrated evidence. Skills and certifications establish listed-only evidence. Summary and education content is treated as ambiguous unless stronger evidence is available.

These tiers describe the strength of evidence found in the resume. They do not prove competence or lack of competence.

## 5. Role scorecards

Each role has its own criterion weights. Each scorecard totals 100 points.

### LCA Consultant

| Criterion | Weight |
|---|---:|
| LCA methodology | 20 |
| Life Cycle Inventory (LCI) | 10 |
| LCA standards | 15 |
| LCA software | 15 |
| Environmental Product Declaration (EPD) | 10 |
| Impact assessment | 10 |
| Carbon footprint | 10 |
| Environmental assessment | 10 |
| **Total** | **100** |

### Growth For Impact UI/UX Internship

| Criterion | Weight |
|---|---:|
| Design tools | 10 |
| Wireframing | 8 |
| Prototyping | 10 |
| Interaction design | 10 |
| Visual design | 10 |
| User research | 15 |
| Usability testing | 12 |
| Design methods | 10 |
| Research artifacts | 8 |
| Design systems | 7 |
| **Total** | **100** |

### Score calculation

For each criterion:

Criterion score = criterion weight × evidence-tier credit

The total score is:

Total score = (sum of earned criterion scores / sum of criterion weights) × 100

The result is rounded to two decimal places.

The score uses verified evidence and configured criterion weights. Candidate names, institutions, and eligibility flags are deliberately excluded from the criterion-scoring calculation.

## 6. Classification and review

The configured classification thresholds are:

| Condition | Classification |
|---|---|
| Score ≥ 75 | strong_match |
| Score ≥ 50 and below 75 | potential_match |
| Score below 50 | not_a_match |

Review takes precedence over these score bands. A candidate is classified as needs_review when a review flag is present or source confidence is below 0.60.

A classification is not an automatic rejection or selection decision. A low score may reflect missing information, incomplete source material, or limitations in the evidence dictionary.

## 7. Experience calculation convention

Experience is represented using the `elapsed_months` convention.

The system parses month-year, numeric month-year, and year-based date ranges. Current-role end dates use the configured reference date. Duration-only statements and uncertain dates are flagged rather than silently converted into precise date ranges.

Overlapping employment and internship periods are merged before total elapsed months are summed. This prevents overlapping calendar periods from being counted twice.

Total experience includes detected employment and internship periods with valid date ranges. Project periods are not included in this total.

LCA experience is calculated separately. A role contributes to the LCA-specific total only when its description contains explicit LCA/LCI-related evidence and its date range is valid. Overlapping LCA periods are also merged.

The implementation does not currently establish a dedicated UI/UX experience-month value. UI/UX ranking therefore does not substitute general total experience for role-specific UI/UX experience.

These values are maximum elapsed calendar-month estimates based on resume dates. They do not verify continuous employment, full-time status, actual hours worked, or the exact duration of relevant responsibilities.

## 8. Job-description experience requirements

The dashboard configuration currently contains a 2–3 years experience requirement.

The repository does not contain the original job-description files establishing a separate 4–6 years requirement. Therefore, any reported 4–6 versus 2–3 years discrepancy remains unverified from the repository materials reviewed for this methodology.

The configured requirement should not be treated as a verified quotation from the original job description until checked against the source JD. ResumeLens does not silently reconcile conflicting requirement values.

## 9. Evaluation and threshold calibration

The manual evaluation contains 15 labelled resumes:

- Calibration set: 8 resumes
- Held-out set: 7 resumes

The calibration and held-out labels were assigned by one annotator through review of the original resumes against the two role descriptions. Classifier scores, predictions, and rankings were not used to assign the labels.

### Recorded results

| Measure | Calibration | Held-out |
|---|---:|---:|
| Sample count | 8 | 7 |
| Accuracy | 37.5% (3/8) | 57.1% (4/7) |
| Macro-F1 | 0.481 | 0.571 |
| Needs-review cases | 1 | 0 |

The held-out set contains five UI/UX labels and two Neither labels. It contains no LCA-labelled examples, so held-out LCA performance cannot be evaluated.

Held-out UI/UX precision was 1.00 and recall was 0.40. Held-out Neither precision was 0.40 and recall was 1.00.

Thresholds from 50 through 70 produced identical predictions on the calibration set. The selected threshold of 50 is therefore a provisional fallback, not an empirically demonstrated optimum.

Sensitivity checks at thresholds 55, 60, and 65 produced the same calibration results.

See [the evaluation report](../eval/report.md) and [machine-readable results](../eval/results.json) for the recorded evaluation details.

## 10. Fairness, limitations, and human oversight

ResumeLens is a prototype and has not been validated as a hiring assessment model.

Important limitations include:

- The evaluation sample is small and uses one annotator.
- The held-out sample contains no LCA-labelled examples.
- Resume wording, formatting, extraction quality, and missing information can affect evidence detection.
- Keyword-based evidence matching may miss equivalent terminology or context.
- Listed skills receive partial credit but do not demonstrate practical ability.
- Date-derived experience is an estimate, not verified employment duration.
- Quality-rule weights and the classification threshold are provisional.
- The evaluation does not establish fairness, predictive validity, or job-performance validity across demographic groups.

The system does not establish candidate suitability from demographic characteristics. Nevertheless, the current evaluation is not sufficient to demonstrate that outcomes are free from bias.

Recruiters should inspect source evidence, consider missing or ambiguous information, and apply consistent human judgment. ResumeLens should not be used as the sole basis for hiring, rejection, or other consequential employment decisions.

## 11. Reproducibility

The methodology is implemented in the project source code, including:

- `src/lib/extraction.ts`
- `src/lib/docx-common.ts`
- `src/lib/quality.ts`
- `src/lib/evidence.ts`
- `src/lib/scoring.ts`
- `src/lib/classification.ts`
- `src/lib/normalization/experience.ts`
- `src/lib/ranking.ts`
- `src/config.ts`

Evaluation artifacts are maintained under `eval/`. Dataset cleaning observations and documented corrections are maintained in [the cleaning log](./cleaning-log.md).
