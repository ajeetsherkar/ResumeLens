# ResumeLens — Dataset Cleaning and Review Log

## 1. Scope

This log records source-quality observations, extraction issues, and documented corrections made during ResumeLens dataset preparation and evaluation.

Original DOCX resumes are preserved. Source text is not silently reconstructed. Any structured correction must retain an audit record and an explanation.

## 2. Dataset and evaluation sampling

- Original dataset: 46 DOCX files
- Eligible sampling population: 45 readable resumes
- Excluded: `resume_037.docx` (confirmed empty)
- Selected blind-review sample: 15 resumes
- Calibration set: 8 resumes
- Held-out set: 7 resumes
- Sampling seed: `20261111`

Human labels were assigned by reviewing original resumes against the LCA Consultant and Growth For Impact UI/UX Internship job descriptions. Classifier scores, predictions, and rankings were not used to assign labels.

## 3. Source-text observations

The following observations were recorded while reviewing the original documents. They are treated as source-quality issues unless independent evidence establishes that the extraction process introduced the problem.

| Source file | Issue type | Observation | Action taken | Reason |
|---|---|---|---|---|
| `resume_029.docx` | `source_incomplete` | Truncated phrase: "Led ion"; some ISO standard references are incomplete. | Preserved original wording; flagged for source verification. | Missing text and standard identifiers cannot be reliably reconstructed. |
| `resume_030.docx` | `source_incomplete` | Truncated phrase: "team of s". | Preserved original wording; flagged for source verification. | The intended phrase is not established by the available source. |
| `resume_012.docx` | `source_incomplete` | Incomplete phrase: "Reduced booking flow from ion". | Preserved original wording; flagged for source verification. | The missing phrase must not be guessed. |
| `resume_023.docx` | `ambiguous_evidence` | Possible malformed phrase: "40-omers". | Preserved original wording; flagged as ambiguous. | The intended term or value is uncertain. |
| `resume_003.docx` | `source_incomplete` / `ambiguous_evidence` | Incomplete standard/certification references, including "ISO :2026 EMS" and "ISO Life Cycle Assessment (LCA)". | Preserved original wording; did not infer a specific standard or certification. | The available text does not establish the missing standard number or credential. |
| `resume_031.docx` | `source_incomplete` / `ambiguous_evidence` | Incomplete standard reference: "IS :1983". | Preserved original wording; flagged for source verification. | The reference cannot safely be normalized into a specific standard. |

These are observations from the reviewed documents. They are not proof that the DOCX extraction engine caused the truncation.

## 4. Empty source file

| Source file | Issue type | Observation | Action taken | Reason |
|---|---|---|---|---|
| `resume_037.docx` | `source_incomplete` | The DOCX was confirmed empty. | Excluded it from the eligible sampling population; no content was reconstructed. | An empty document cannot provide reviewable resume evidence. |

The exclusion leaves 45 readable documents from the original 46-file dataset.

## 5. Audited structured-data correction

### Candidate 046 — Education institution association

- Source file: `resume_046.docx`
- Field corrected: `education[0].institution`
- Original structured value: `null`
- Corrected value: `Kassel University (DE), Cairo University (EG), Monastir University (TN)`
- Issue type: `extraction_error`

**Observation**

The education extractor placed the university line immediately following the Dual M.Sc. entry into a separate record rather than associating it with the preceding degree entry.

**Action taken**

A narrowly scoped batch override associates the university line with the preceding Dual M.Sc. record. The original source text remains unchanged. The original date and separate source information are retained.

**Reason**

The correction associates an immediately following institution line with the preceding education entry without inventing a qualification or additional evidence.

**Audit record**

| Field | Recorded value |
|---|---|
| Candidate ID | `046` |
| Field | `education[0].institution` |
| Original | `null` |
| Corrected | `Kassel University (DE), Cairo University (EG), Monastir University (TN)` |
| Verified by | Project reviewer |
| Date | `2026-11-14` |

The verifier is recorded as the role label `Project reviewer`, not as a named individual.

This correction is an education-display/data-association correction. It does not add ISO evidence or alter the role-scoring inputs.

## 6. Contact-information observations

No clear email address was observed in the extracted body text of the 15 reviewed documents.

No phone number was confidently identified from the extracted body text. Numeric strings may represent dates, metrics, or other resume content and must not automatically be classified as phone numbers.

This is a body-text observation, not proof that contact information is absent from headers, footers, images, or other embedded content. No contact details are reproduced in this log.

The application uses a privacy flag for detected email or phone-like information so it can be redacted from displayed resume text.

## 7. Extraction and normalization handling

ResumeLens uses Mammoth for DOCX text extraction and a raw DOCX XML fallback. A disagreement between the two extraction outputs generates a review warning.

The quality rules also flag insufficient extracted text, incomplete ISO references, truncated fragments, missing or ambiguous dates, missing required sections, invalid dates, detected contact information, and extraction disagreement.

No claim is made here that an extraction mismatch occurred in a particular candidate unless a candidate-specific observation is recorded above.

## 8. Cleaning policy

1. Preserve original DOCX files unchanged.
2. Do not silently repair incomplete phrases or standard references.
3. Keep original source text available for traceability.
4. Record extraction and formatting anomalies before normalization.
5. Use narrow, auditable overrides for supported structured-data corrections.
6. Preserve original values and document the reason for each override.
7. Do not infer missing qualifications, certifications, standards, or experience.
8. Do not expose candidate contact details in evaluation reports.
9. Treat uncertain numeric strings as unverified rather than assuming they are phone numbers.
10. Keep human evaluation labels independent of classifier scores and predictions.

## 9. Evaluation results and caveats

The evaluation used 15 manually labelled resumes:

- Calibration: 8 resumes
- Held-out: 7 resumes
- Calibration accuracy: 37.5% (3/8)
- Held-out accuracy: 57.1% (4/7)
- Calibration macro-F1: 0.481
- Held-out macro-F1: 0.571

The held-out sample contains five UI/UX labels and two Neither labels, with no LCA-labelled examples. Held-out LCA performance therefore cannot be evaluated.

One annotator assigned the labels. The sample is small and does not establish predictive validity, job-performance validity, or fairness.

Thresholds from 50 through 70 produced identical calibration predictions. The selected threshold of 50 is a provisional fallback, not an empirically established optimum.

See `eval/report.md` and `eval/results.json` for the evaluation details.

## 10. Interpretation

The cleaning log distinguishes source-incomplete information from extraction errors and ambiguous evidence. A source-text anomaly should not automatically be attributed to the parser.

Structured corrections are documented separately from original resume content. Reviewers should inspect the original source whenever an issue may affect interpretation or a screening decision.

ResumeLens is a human-review decision-support prototype, not an autonomous hiring or rejection system.
