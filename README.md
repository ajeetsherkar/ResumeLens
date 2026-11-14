# ResumeLens

**An explainable, evidence-based resume screening prototype for LCA and UI/UX roles.**

ResumeLens extracts information from DOCX resumes, evaluates source quality, identifies role-specific evidence, calculates transparent criterion-based scores, and supports human review through a candidate dashboard.

**Live application:** https://resume-lens-topaz.vercel.app

---

## 1. Overview

ResumeLens evaluates resumes against two job descriptions:

- **LCA Consultant:** Life Cycle Assessment (LCA), Life Cycle Inventory (LCI), standards, software, EPD, impact assessment, and relevant experience.
- **UI/UX Intern:** Design tools, wireframing, prototyping, interaction and visual design, user research, usability testing, and design systems.

The application provides:

- Candidate ranking and role-specific score breakdowns.
- Evidence snippets linked to extracted resume text.
- Source-quality warnings and confidence indicators.
- A human-review queue for uncertain or incomplete records.
- Candidate detail views with education, experience, evidence, and warnings.
- Auditable batch data corrections.
- Session-only DOCX upload, extraction, review, and hypothetical ranking.
- A methodology page explaining scoring and classification.

ResumeLens is a decision-support prototype. It does not make hiring decisions.

## 2. Architecture

### Processing pipeline

```text
DOCX Resume Files
       |
       v
Mammoth Text Extraction
       |
       v
DOCX XML Fallback Comparison
       |
       v
Extracted Resume Records
       |
       v
Section and Profile Normalization
       |
       +---- Skills
       +---- Education
       +---- Experience
       +---- Source Quality
       +---- Privacy Signals
       |
       v
Structured Profiles
       |
       v
Evidence Assessment
       |
       v
Criterion-Based Scoring
       |
       v
Classification and Review Flags
       |
       v
Candidate Dataset
       |
       v
Next.js Dashboard
```

### Application architecture

- **Frontend:** Next.js App Router, React, TypeScript, and Tailwind CSS.
- **Extraction:** Mammoth and DOCX XML fallback utilities.
- **Normalization:** TypeScript modules for sections, skills, education, experience, quality, and privacy.
- **Evidence and scoring:** Role-specific evidence dictionaries, evidence tiers, weighted scoring, and classification rules.
- **Data access:** Local JSON files in development and private Vercel Blob in production.
- **Testing:** Vitest, ESLint, and TypeScript.

### Important project paths

| Path | Purpose |
|---|---|
| `src/app/` | Application pages and API routes |
| `src/components/dashboard/` | Dashboard, candidate details, review queue, and upload UI |
| `src/lib/` | Extraction, normalization, evidence, scoring, classification, and data access |
| `scripts/extract-resumes.ts` | Batch DOCX extraction |
| `scripts/build-profiles.ts` | Structured profile generation |
| `scripts/build-dataset.ts` | Candidate dataset and ranking generation |
| `scripts/evaluate.ts` | Evaluation and threshold analysis |
| `src/config.ts` | Role weights, evidence credits, and classification settings |
| `docs/methodology.md` | Detailed methodology |
| `docs/cleaning-log.md` | Data cleaning and correction record |
| `eval/` | Evaluation labels, sample manifest, results, and report |
| `overrides.json` | Auditable batch corrections |

## 3. Local setup

### Prerequisites

- Node.js compatible with the installed Next.js version.
- npm.
- Git.
- Access to the DOCX source dataset for batch extraction.

### Install dependencies

```bash
git clone https://github.com/ajeetsherkar/ResumeLens.git
cd ResumeLens
npm install
```

### Prepare local data

The batch extraction script expects DOCX files in:

```text
~/Desktop/growth-for-impact-resume-dataset/resumes/
```

The source directory is configured in `scripts/extract-resumes.ts`.

The extraction pipeline expects files named in this format:

```text
resume_001.docx
resume_002.docx
...
resume_046.docx
```

The generated files are written under `data/processed/`. This directory is Git-ignored and must be generated locally.

### Run the development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

For local dashboard data access, generate the required `candidates.json` and `structured-profiles.json` files before opening the dashboard.

## 4. Batch processing commands

Run the following commands in order.

### Step 1: Extract DOCX resumes

```bash
npx tsx scripts/extract-resumes.ts
```

The script:

- Reads the configured resume directory.
- Extracts text using Mammoth.
- Uses DOCX XML fallback extraction for comparison.
- Records extraction status and warnings.
- Writes extracted records and extraction reports.

Main outputs:

```text
data/processed/extracted.json
data/processed/extraction-report.json
data/processed/extraction-report.md
```

### Step 2: Build structured profiles

```bash
npx tsx scripts/build-profiles.ts
```

This processes extracted records into structured profiles, including sections, skills, education, experience, source quality, privacy signals, and warnings.

Main outputs:

```text
data/processed/structured-profiles.json
data/processed/profile-validation-report.json
```

The configured held-out evaluation candidates are excluded from development profiles.

### Step 3: Build the candidate dataset

```bash
npx tsx scripts/build-dataset.ts
```

This command:

- Validates candidate identifiers and batch overrides.
- Applies supported, auditable corrections.
- Assesses role-specific evidence.
- Calculates LCA and UI/UX scores.
- Applies classification and review rules.
- Writes the candidate dataset.

Output:

```text
data/processed/candidates.json
```

The `overrides.json` file is required by this build step.

### Step 4: Run evaluation

```bash
npx tsx scripts/evaluate.ts
```

The evaluation script uses the labelled evaluation sample and extracted data to produce threshold and classification results.

Outputs include:

```text
eval/results.json
eval/report.md
```

See the evaluation report for the calibration and held-out results and their limitations.

## 5. Testing and quality checks

Run the project checks:

```bash
npm run lint
npm test
npm run build
```

TypeScript can also be checked independently:

```bash
npx tsc --noEmit
```

The test suite uses Vitest.

## 6. Methodology summary

### Evidence tiers

ResumeLens assigns evidence credits according to the strength and reliability of the available resume evidence.

| Evidence tier | Credit |
|---|---:|
| Demonstrated | 1.00 |
| Listed only | 0.50 |
| Ambiguous | 0.25 |
| Missing | 0.00 |
| Source incomplete | 0.00 |

### Scoring

Each role has its own weighted criteria. A criterion receives its configured weight multiplied by the applicable evidence credit.

```text
Final score =
(Earned criterion points / Maximum criterion points) * 100
```

Scores are normalized to a 0–100 scale.

### Classification

The configured classification rules are:

- Strong match: score of at least 75.
- Potential match: score of at least 50.
- Not a match: score below 50.
- Needs review: review flag present or source confidence below 0.60.

A review requirement takes precedence over the score bands.

The threshold of 50 is provisional. It should not be interpreted as an empirically validated hiring cutoff.

### Experience

Experience is calculated using elapsed calendar months from available role dates. Overlapping periods are merged to avoid double counting. Project work is not included in employment experience.

These calculations are estimates based on resume dates, not verified full-time working hours.

For full details, see [`docs/methodology.md`](docs/methodology.md).

## 7. Production deployment and data storage

The production application is deployed on Vercel:

https://resume-lens-topaz.vercel.app

Production candidate data is retrieved from a private Vercel Blob store using these paths:

```text
processed/candidates.json
processed/structured-profiles.json
```

Local development and tests use the corresponding files in `data/processed/`.

Production deployment requires the appropriate Vercel Blob configuration and access token. Configure secrets through the deployment environment; do not commit credentials or private datasets.

The dashboard and API access are subject to the production Vercel deployment's access controls.

## 8. Session-only resume upload

The dashboard supports DOCX upload for an additional candidate.

The workflow extracts and presents the resume for review, allows session-only text corrections, and calculates a hypothetical ranking against the existing candidate pool.

These corrections and the hypothetical candidate are not saved to the permanent batch dataset.

Unsupported, empty, corrupt, and oversized files are rejected by the upload processing workflow.

## 9. Evaluation and limitations

The evaluation uses a small manually labelled sample with calibration and held-out partitions.

The evaluation report records:

- Calibration and held-out performance.
- Confusion matrix and classification metrics.
- Threshold sensitivity analysis.
- Class-support limitations.

Important limitations:

- The labelled evaluation sample is small and was annotated by one annotator.
- The held-out partition contains no LCA-labelled examples, so held-out LCA performance cannot be established.
- The scoring and quality-rule weights are provisional.
- Resume wording, formatting, missing information, and extraction quality can affect evidence detection.
- A listed skill does not necessarily demonstrate practical proficiency.
- Experience dates may be incomplete or ambiguous.
- The system has not been validated as a hiring model.

ResumeLens should support human review, not replace it. Recruiters must inspect source evidence and apply consistent judgment. Do not use the system as the sole basis for hiring or rejection decisions.

## 10. Documentation

- [Methodology](docs/methodology.md)
- [Cleaning log](docs/cleaning-log.md)
- [Evaluation report](eval/report.md)

---

## 11. Repository data handling

This repository contains application source code and project documentation. Resume source files and generated private candidate datasets are excluded from version control.

Do not add private resume files, generated candidate datasets, credentials, or deployment secrets to Git.
