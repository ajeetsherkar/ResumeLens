import fs from "node:fs";

import type { Warning } from "../src/types";
import {
  extractSections,
} from "../src/lib/normalization/sections";
import {
  normalizeSkills,
} from "../src/lib/normalization/skills";
import {
  extractEducation,
} from "../src/lib/normalization/education";
import { scanPrivacy } from "../src/lib/normalization/privacy";
import {
  assessSourceQuality,
} from "../src/lib/quality";
import { extractRoles } from "../src/lib/normalization/roles";
import {
  calculateCandidateExperience,
} from "../src/lib/normalization/experience";
import { scoreRole } from "../src/lib/scoring";
import { classifyRole } from "../src/lib/classification";
import type { EvidenceInput } from "../src/lib/evidence";
import type { Classification } from "../src/types";

type HumanLabel = "LCA" | "UI/UX" | "Neither";
type PredictedLabel = HumanLabel | "Needs review";

interface Label {
  candidate_id: string;
  split: "calibration" | "held-out";
  human_label: HumanLabel;
}

interface ExtractedResume {
  candidate_id: string;
  source_file: string;
  extraction_status: EvidenceInput["extraction_status"];
  raw_text: string;
  warnings: Array<{ code: string; message: string }>;
}

interface Prediction {
  candidate_id: string;
  split: Label["split"];
  human_label: HumanLabel;
  predicted_label: PredictedLabel;
  lca_score: number;
  uiux_score: number;
  lca_classification: Classification;
  uiux_classification: Classification;
  source_confidence: number;
  review_required: boolean;
}

const LABELS_PATH = "eval/labels.csv";
const EXTRACTED_PATH = "data/processed/extracted.json";
const RESULTS_PATH = "eval/results.json";

const CLASSES: HumanLabel[] = ["LCA", "UI/UX", "Neither"];
const THRESHOLDS = Array.from({ length: 21 }, (_, i) => 50 + i);

function normalizeId(value: string): string {
  return value.replace(/^resume_/, "").padStart(3, "0");
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += char;
    }
  }

  if (quoted) throw new Error("Malformed CSV: unclosed quoted field.");
  values.push(value);
  return values;
}

function readLabels(): Label[] {
  const lines = fs.readFileSync(LABELS_PATH, "utf8")
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/);

  const headers = parseCsvLine(lines[0]);
  const required = ["candidate_id", "split", "human_label"];

  for (const field of required) {
    if (!headers.includes(field)) {
      throw new Error(`Missing labels.csv column: ${field}`);
    }
  }

  return lines.slice(1).filter(Boolean).map((line, index) => {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(
      headers.map((header, i) => [header, values[i] ?? ""]),
    );

    if (!["calibration", "held-out"].includes(row.split)) {
      throw new Error(`Invalid split on labels.csv row ${index + 2}.`);
    }

    if (!CLASSES.includes(row.human_label as HumanLabel)) {
      throw new Error(`Invalid human label on labels.csv row ${index + 2}.`);
    }

    return {
      candidate_id: normalizeId(row.candidate_id),
      split: row.split as Label["split"],
      human_label: row.human_label as HumanLabel,
    };
  });
}

function toWarningCode(code: string): Warning["code"] {
  const knownCodes: Warning["code"][] = [
    "missing_section",
    "low_quality_extraction",
    "extraction_mismatch",
    "ambiguous_date",
    "overlapping_experience",
    "unsupported_format",
    "other",
  ];

  return knownCodes.includes(code as Warning["code"])
    ? (code as Warning["code"])
    : "other";
}

function buildPrediction(
  label: Label,
  record: ExtractedResume,
  threshold: number,
): Prediction {
  const rawText = record.raw_text ?? "";
  const privacy = scanPrivacy(rawText);
  const sectionResult = extractSections(rawText);
  const skills = normalizeSkills(sectionResult);
  const education = extractEducation(sectionResult.sections.education);
  const roles = extractRoles(sectionResult.sections.experience);

  const experience = calculateCandidateExperience(
    roles.map(role => ({
      role_title: role.role_title,
      employer: role.employer,
      original_date_text: role.original_date_text,
      description: role.description,
      attribution: role.attribution,
    })),
    "Nov 2026",
  );

  const warnings: Warning[] = [
    ...record.warnings.map(warning => ({
      code: toWarningCode(warning.code),
      message: warning.message,
    })),
    ...sectionResult.warnings,
  ];

  const quality = assessSourceQuality({
    raw_text: rawText,
    extraction_status: record.extraction_status,
    sections: sectionResult.sections,
    roles,
    experience,
    privacy,
    extraction_warnings: warnings,
  });

  // Keep the same normalization pipeline as build-profiles.ts.
  void skills;
  void education;

  const evidenceInput: EvidenceInput = {
    raw_text: rawText,
    sections: sectionResult.sections,
    extraction_status: record.extraction_status,
    quality,
  };

  const rules = {
    potential_match_min_score: threshold,
    strong_match_min_score: 75,
    minimum_source_confidence: 0.60,
  };

  const lcaScore = scoreRole(evidenceInput, "LCA").total_score;
  const uiuxScore = scoreRole(evidenceInput, "UI/UX").total_score;

  const lcaClassification = classifyRole({
    score: lcaScore,
    sourceConfidence: quality.confidence,
    reviewRequired: quality.review_required,
  }, rules);

  const uiuxClassification = classifyRole({
    score: uiuxScore,
    sourceConfidence: quality.confidence,
    reviewRequired: quality.review_required,
  }, rules);

  const lcaMatch =
    lcaClassification === "strong_match" ||
    lcaClassification === "potential_match";
  const uiuxMatch =
    uiuxClassification === "strong_match" ||
    uiuxClassification === "potential_match";

  let predictedLabel: PredictedLabel;

  if (
    lcaClassification === "needs_review" ||
    uiuxClassification === "needs_review"
  ) {
    predictedLabel = "Needs review";
  } else if (lcaMatch && uiuxMatch) {
    predictedLabel = lcaScore >= uiuxScore ? "LCA" : "UI/UX";
  } else if (lcaMatch) {
    predictedLabel = "LCA";
  } else if (uiuxMatch) {
    predictedLabel = "UI/UX";
  } else {
    predictedLabel = "Neither";
  }

  return {
    candidate_id: label.candidate_id,
    split: label.split,
    human_label: label.human_label,
    predicted_label: predictedLabel,
    lca_score: lcaScore,
    uiux_score: uiuxScore,
    lca_classification: lcaClassification,
    uiux_classification: uiuxClassification,
    source_confidence: quality.confidence,
    review_required: quality.review_required,
  };
}

function macroF1(rows: Prediction[]) {
  const perClass = CLASSES.map(label => {
    const tp = rows.filter(
      row => row.human_label === label && row.predicted_label === label,
    ).length;
    const fp = rows.filter(
      row => row.human_label !== label && row.predicted_label === label,
    ).length;
    const fn = rows.filter(
      row => row.human_label === label && row.predicted_label !== label,
    ).length;

    const support = tp + fn;
    const predictedCount = tp + fp;

    const precision =
      support === 0 && predictedCount === 0
        ? null
        : predictedCount === 0
          ? 0
          : tp / predictedCount;

    const recall = support === 0 ? null : tp / support;

    const f1 =
      support === 0
        ? null
        : precision === 0 || recall === 0
          ? 0
          : (2 * precision! * recall!) / (precision! + recall!);

    return { label, precision, recall, f1, support };
  });

  const representedClasses = perClass.filter(item => item.support > 0);

  return {
    macro_f1:
      representedClasses.length === 0
        ? null
        : representedClasses.reduce((sum, item) => sum + (item.f1 ?? 0), 0) /
          representedClasses.length,
    per_class: perClass,
  };
}

function summarize(rows: Prediction[]) {
  const correct = rows.filter(
    row => row.human_label === row.predicted_label,
  ).length;

  const f1 = macroF1(rows);

  return {
    count: rows.length,
    correct,
    agreement: rows.length === 0 ? 0 : correct / rows.length,
    abstentions: rows.filter(
      row => row.predicted_label === "Needs review",
    ).length,
    macro_f1: f1.macro_f1,
    per_class: f1.per_class,
    confusion_matrix: {
      labels: CLASSES,
      rows: CLASSES.map(actual => ({
        actual,
        predicted: CLASSES.map(predicted =>
          rows.filter(
            row =>
              row.human_label === actual &&
              row.predicted_label === predicted,
          ).length,
        ),
        needs_review: rows.filter(
          row =>
            row.human_label === actual &&
            row.predicted_label === "Needs review",
        ).length,
      })),
    },
  };
}

function main() {
  const labels = readLabels();
  const extracted = JSON.parse(
    fs.readFileSync(EXTRACTED_PATH, "utf8"),
  ) as ExtractedResume[];

  if (labels.length !== 15) throw new Error(`Expected 15 labels; found ${labels.length}.`);
  if (labels.filter(row => row.split === "calibration").length !== 8) {
    throw new Error("Expected exactly 8 calibration labels.");
  }
  if (labels.filter(row => row.split === "held-out").length !== 7) {
    throw new Error("Expected exactly 7 held-out labels.");
  }

  const labelIds = labels.map(row => row.candidate_id);
  if (new Set(labelIds).size !== labelIds.length) {
    throw new Error("Duplicate candidate IDs in labels.csv.");
  }

  const recordsById = new Map(
    extracted.map(record => [normalizeId(record.candidate_id), record]),
  );

  const missing = labels.filter(row => !recordsById.has(row.candidate_id));
  if (missing.length) {
    throw new Error(`Missing extracted records: ${missing.map(row => row.candidate_id).join(", ")}`);
  }

  const calibrationLabels = labels.filter(row => row.split === "calibration");
  const heldOutLabels = labels.filter(row => row.split === "held-out");

  const calibration = THRESHOLDS.map(threshold => {
    const predictions = calibrationLabels.map(label =>
      buildPrediction(label, recordsById.get(label.candidate_id)!, threshold),
    );

    return {
      threshold,
      ...summarize(predictions),
      predictions,
    };
  });

  const validCalibration = calibration.filter(
    result => result.macro_f1 !== null,
  );

  if (validCalibration.length === 0) {
    throw new Error("Cannot select a threshold: calibration macro-F1 is unavailable.");
  }

  const bestMacroF1 = Math.max(
    ...validCalibration.map(result => result.macro_f1!),
  );

  const tiedBest = validCalibration.filter(
    result => result.macro_f1 === bestMacroF1,
  );

  const predictionsIdentical = calibration.every(result =>
    JSON.stringify(result.predictions.map(p => p.predicted_label)) ===
    JSON.stringify(calibration[0].predictions.map(p => p.predicted_label)),
  );

  const selected = predictionsIdentical
    ? calibration.find(result => result.threshold === 50)!
    : [...tiedBest].sort((a, b) => b.threshold - a.threshold)[0];

  const heldOut = heldOutLabels.map(label =>
    buildPrediction(label, recordsById.get(label.candidate_id)!, selected.threshold),
  );

  const sensitivity = [55, 60, 65].map(threshold => {
    const predictions = calibrationLabels.map(label =>
      buildPrediction(label, recordsById.get(label.candidate_id)!, threshold),
    );
    return { threshold, ...summarize(predictions) };
  });

  const results = {
    generated_at: new Date().toISOString(),
    method: {
      calibration_n: calibrationLabels.length,
      held_out_n: heldOutLabels.length,
      total_n: labels.length,
      threshold_grid: THRESHOLDS,
      selection_metric: "macro-F1 across LCA, UI/UX and Neither",
      threshold_selection_rule: "Maximize calibration macro-F1; if all tested thresholds produce identical predictions, retain T=50 as a provisional fallback.",
      abstention_policy: "Needs review is reported as an abstention and counts as non-agreement.",
      strong_match_min_score: 75,
      minimum_source_confidence: 0.60,
    },
    selected_threshold: selected.threshold,
    calibration,
    held_out: {
      ...summarize(heldOut),
      predictions: heldOut,
    },
    sensitivity,
  };

  fs.mkdirSync("eval", { recursive: true });
  fs.writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2), "utf8");

  console.log("===== CALIBRATION RESULTS =====");
  for (const result of calibration) {
    console.log(
      `T=${result.threshold} | agreement=${(result.agreement * 100).toFixed(1)}%` +
      ` | macro-F1=${result.macro_f1 === null ? "N/A" : result.macro_f1.toFixed(3)}` +
      ` | review=${result.abstentions}`,
    );
  }

  console.log(`\nSelected threshold: ${selected.threshold}`);
  console.log("\n===== HELD-OUT RESULTS =====");
  console.log(JSON.stringify(summarize(heldOut), null, 2));

  console.log("\n===== SENSITIVITY (CALIBRATION CASES) =====");
  console.log(JSON.stringify(sensitivity, null, 2));

  console.log(`\nEvaluation results written to ${RESULTS_PATH}`);
}

main();
