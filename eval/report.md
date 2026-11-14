# ResumeLens — Evaluation and Threshold Calibration

**Evaluation date:** 14 November 2026
**Evaluation size:** 15 manually labelled resumes
**Annotators:** One
**Evaluation type:** Prototype evaluation

## 1. Objective

Evaluate the current ResumeLens classification output against manually assigned labels for two roles:

- Life Cycle Assessment (LCA)
- UI/UX Design

The third label, Neither, represents resumes that do not match either role.

## 2. Evaluation methodology

The 15 labelled resumes were divided into:

| Split | Cases | Purpose |
|---|---:|---|
| Calibration | 8 | Threshold comparison |
| Held-out | 7 | Separate evaluation after threshold selection |
| Total | 15 | Single-annotator evaluation |
The calibration set was evaluated across thresholds from 50 to 70 using macro-F1 across LCA, UI/UX and Neither.

A prediction of `Needs review` is treated as an abstention and counts as non-agreement.

## 3. Threshold calibration

All tested thresholds from 50 through 70 produced identical calibration predictions.

| Threshold | Agreement | Macro-F1 | Needs review |
|---:|---:|---:|---:|
| 50 | 37.5% | 0.481 | 1 |
| 55 | 37.5% | 0.481 | 1 |
| 60 | 37.5% | 0.481 | 1 |
| 65 | 37.5% | 0.481 | 1 |
| 70 | 37.5% | 0.481 | 1 |
### Selected threshold: 50

No threshold in the tested range demonstrated better calibration performance. Therefore, 50 is retained as the provisional fallback rather than claimed as an empirically optimal threshold.

The strong-match threshold remains 75, and the minimum source-confidence requirement remains 0.60.

## 4. Held-out evaluation

The held-out set contains seven cases.

| Metric | Result |
|---|---:|
| Correct predictions | 4 / 7 |
| Overall agreement | 57.1% |
| Macro-F1 (represented classes) | 0.571 |
| Needs review | 0 |
### Per-class results

| Actual class | Support | Precision | Recall | F1 |
|---|---:|---:|---:|---:|
| LCA | 0 | N/A | N/A | N/A |
| UI/UX | 5 | 1.000 | 0.400 | 0.571 |
| Neither | 2 | 0.400 | 1.000 | 0.571 |
LCA performance cannot be measured on the held-out set because it contains no LCA-labelled examples. N/A does not mean zero performance.

### Confusion matrix

Rows represent actual labels; columns represent predicted labels.

| Actual \ Predicted | LCA | UI/UX | Neither | Needs review |
|---|---:|---:|---:|---:|
| LCA | 0 | 0 | 0 | 0 |
| UI/UX | 0 | 2 | 3 | 0 |
| Neither | 0 | 0 | 2 | 0 |
## 5. Threshold sensitivity

Sensitivity was checked on the calibration cases only.

| Threshold | Agreement | Macro-F1 | Abstentions |
|---:|---:|---:|---:|
| 55 | 37.5% | 0.481 | 1 |
| 60 | 37.5% | 0.481 | 1 |
| 65 | 37.5% | 0.481 | 1 |
The tested thresholds did not change the predictions. This suggests that changing the threshold alone is insufficient to address the observed classification disagreements.

## 6. Observations

- Calibration agreement is limited at 37.5%.
- Held-out agreement is 57.1% on seven cases.
- The held-out set correctly identifies two of five UI/UX cases.
- Both Neither cases are correctly classified.
- No held-out LCA cases are available for measuring LCA performance.
- Evidence-tier scoring can award partial credit to skills listed without demonstrated project or experience evidence.

## 7. Limitations

- The evaluation contains only 15 labelled resumes.
- Labels were assigned by a single annotator; inter-annotator agreement was not measured.
- The held-out split contains no LCA-labelled examples.
- The calibration set is small, and its results are in-sample.
- The tested threshold range did not distinguish between candidate thresholds.
- These results are a prototype evaluation, not evidence of production-level hiring accuracy.

## 8. Conclusion

ResumeLens demonstrates an explainable screening workflow, but the current evaluation identifies meaningful classification disagreements, particularly for UI/UX candidates.

The potential-match threshold of 50 is retained as a provisional fallback because the calibration grid did not identify a better-performing threshold.

ResumeLens should be used as a decision-support prototype with human review, not as an autonomous hiring decision system or a validated hiring model.
