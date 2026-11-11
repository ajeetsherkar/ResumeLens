# Resume Dataset Cleaning Log — Day 1 Blind Evaluation

## Scope

This log records document-quality observations from the 15 randomly
selected original DOCX resumes reviewed for blind human labelling.

The original DOCX files were reviewed directly. No classifier output
or scoring results were used.

## Sampling context

- Sampling seed: 20261111
- Original dataset: 46 DOCX files
- Eligible sampling population: 45 readable resumes
- Excluded from sampling: resume_037.docx (confirmed empty during Session 4)
- Selected sample: 15 resumes
- Calibration: 8
- Held-out: 7

## Observed text-quality issues

| Candidate | Observation | Treatment |
|---|---|---|
| resume_029 | Truncated phrase: "Led ion". Some ISO standard references are incomplete. | Preserve original wording; flag for source verification. |
| resume_030 | Truncated phrase: "team of s". | Preserve original wording; flag for source verification. |
| resume_012 | Incomplete phrase: "Reduced booking flow from ion". | Preserve original wording; flag for source verification. |
| resume_023 | Possible malformed phrase: "40-omers". | Preserve original wording; flag for source verification. |
| resume_003 | Incomplete standard/certification references, including "ISO :2026 EMS" and "ISO Life Cycle Assessment (LCA)". | Preserve original wording; flag for source verification. |
| resume_031 | Incomplete standard reference: "IS :1983". | Preserve original wording; flag for source verification. |

## Contact information observations

No clear email address was observed in the extracted body text of
the 15 reviewed documents.

No phone number was confidently identified from the extracted body
text. Numeric strings may represent dates, metrics, or other resume
content and must not automatically be classified as phone numbers.

This is a body-text observation, not proof that contact information
is absent from document headers, footers, images, or other embedded
content. No contact details are reproduced in this log.

## Cleaning policy

1. Preserve original DOCX files unchanged.
2. Do not silently repair incomplete phrases or standard references.
3. Keep the original source text available for traceability.
4. Record extraction or formatting anomalies before any normalization.
5. Do not expose candidate contact details in evaluation reports.
6. Treat uncertain numeric strings as unverified rather than assuming
   they are phone numbers.

## Annotation independence

Human labels were assigned by reviewing the original resume documents
against the two supplied job descriptions:

- LCA Consultant
- Growth For Impact UI/UX Internship

No classifier scores, predictions, or ranking outputs were used.

The held-out labels are intended to remain separate from calibration
work during subsequent evaluation.
