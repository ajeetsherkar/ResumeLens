import fs from "node:fs";
import path from "node:path";
import { extractSections } from "../src/lib/normalization/sections";
import { extractEducation } from "../src/lib/normalization/education";

const INPUT = "data/processed/extracted.json";
const OUTPUT = "data/processed/education-validation-report.json";

const HELD_OUT_IDS = new Set([
  "012", "005", "003", "031", "034", "017", "036",
]);

const records = JSON.parse(
  fs.readFileSync(INPUT, "utf8"),
);

const heldOutRecords = records.filter(
  (record: { candidate_id: string }) =>
    HELD_OUT_IDS.has(record.candidate_id),
);

if (heldOutRecords.length !== HELD_OUT_IDS.size) {
  throw new Error("Held-out candidate count mismatch.");
}

const developmentRecords = records.filter(
  (record: { candidate_id: string }) =>
    !HELD_OUT_IDS.has(record.candidate_id),
);

const readableRecords = developmentRecords.filter(
  (record: { raw_text: string }) =>
    Boolean(record.raw_text?.trim()),
);

const qualificationCounts: Record<string, number> = {};
const levelCounts: Record<string, number> = {};
const fieldCounts: Record<string, number> = {};
const lineTypeCounts: Record<string, number> = {};

let totalItems = 0;
let offsetChecks = 0;
let offsetFailures = 0;

const candidates = readableRecords.map(
  (record: {
    candidate_id: string;
    raw_text: string;
    extraction_status: string;
  }) => {
    const sections = extractSections(record.raw_text);
    const items = extractEducation(sections.sections.education);

    for (const item of items) {
      totalItems++;

      const level = item.academic_level;
      levelCounts[level] = (levelCounts[level] ?? 0) + 1;

      const type = item.line_type;
      lineTypeCounts[type] = (lineTypeCounts[type] ?? 0) + 1;

      if (item.qualification) {
        qualificationCounts[item.qualification] =
          (qualificationCounts[item.qualification] ?? 0) + 1;
      }

      if (item.field_of_study) {
        fieldCounts[item.field_of_study] =
          (fieldCounts[item.field_of_study] ?? 0) + 1;
      }

      offsetChecks++;

      if (
        record.raw_text.slice(
          item.start_offset,
          item.end_offset,
        ) !== item.original_text
      ) {
        offsetFailures++;
      }
    }

    return {
      candidate_id: record.candidate_id,
      extraction_status: record.extraction_status,
      education_line_count: items.length,
      qualification_count: items.filter(
        item => item.qualification !== null,
      ).length,
      institution_count: items.filter(
        item => item.institution !== null,
      ).length,
      field_count: items.filter(
        item => item.field_of_study !== null,
      ).length,
    };
  },
);

const heldOutExclusionVerified =
  heldOutRecords.length === HELD_OUT_IDS.size &&
  candidates.every(
    (candidate: { candidate_id: string }) =>
      !HELD_OUT_IDS.has(candidate.candidate_id),
  );

const report = {
  generated_at: new Date().toISOString(),
  dataset: {
    total_records: records.length,
    held_out_excluded: heldOutRecords.length,
    development_records: developmentRecords.length,
    readable_development_records: readableRecords.length,
  },
  results: {
    total_education_items: totalItems,
    qualification_counts: qualificationCounts,
    academic_level_counts: levelCounts,
    field_of_study_counts: fieldCounts,
    line_type_counts: lineTypeCounts,
  },
  validation: {
    offset_checks: offsetChecks,
    offset_failures: offsetFailures,
    offsets_valid: offsetFailures === 0,
    held_out_exclusion_verified: heldOutExclusionVerified,
  },
  candidates,
};

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify(report, null, 2));

console.log("===== EDUCATION VALIDATION =====");
console.log("Total records:", report.dataset.total_records);
console.log("Held-out excluded:", report.dataset.held_out_excluded);
console.log("Development records:", report.dataset.development_records);
console.log("Readable development records:", report.dataset.readable_development_records);
console.log("Total education items:", totalItems);

console.log("\nQualification counts:");
console.table(qualificationCounts);

console.log("Academic-level counts:");
console.table(levelCounts);

console.log("Field-of-study counts:");
console.table(fieldCounts);

console.log("Line-type counts:");
console.table(lineTypeCounts);

console.log("\nOffset checks:", offsetChecks);
console.log("Offset failures:", offsetFailures);
console.log("Held-out exclusion verified:", heldOutExclusionVerified);
console.log("Report saved:", OUTPUT);

if (offsetFailures > 0 || !heldOutExclusionVerified) {
  process.exitCode = 1;
}
