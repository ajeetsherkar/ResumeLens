import fs from "node:fs";
import path from "node:path";
import { extractSections } from "../src/lib/normalization/sections";

interface ExtractedResume {
  candidate_id: string;
  source_file: string;
  extraction_status: string;
  raw_text: string;
}

const INPUT = "data/processed/extracted.json";
const OUTPUT = "data/processed/section-validation-report.json";

const HELD_OUT_IDS = new Set([
  "012",
  "005",
  "003",
  "031",
  "034",
  "017",
  "036",
]);

const SECTION_NAMES = [
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "summary",
] as const;

const records = JSON.parse(
  fs.readFileSync(INPUT, "utf8"),
) as ExtractedResume[];

const heldOutRecords = records.filter(
  (record) => HELD_OUT_IDS.has(record.candidate_id),
);

if (heldOutRecords.length !== HELD_OUT_IDS.size) {
  throw new Error(
    `Expected ${HELD_OUT_IDS.size} held-out records, found ${heldOutRecords.length}.`,
  );
}

const developmentRecords = records.filter(
  (record) => !HELD_OUT_IDS.has(record.candidate_id),
);

const emptyRecords = developmentRecords.filter(
  (record) => !record.raw_text?.trim(),
);

const readableRecords = developmentRecords.filter(
  (record) => Boolean(record.raw_text?.trim()),
);

const sectionTotals = Object.fromEntries(
  SECTION_NAMES.map((section) => [section, 0]),
) as Record<(typeof SECTION_NAMES)[number], number>;

const missingSectionTotals = Object.fromEntries(
  SECTION_NAMES.map((section) => [section, 0]),
) as Record<(typeof SECTION_NAMES)[number], number>;

let offsetChecks = 0;
let offsetFailures = 0;
let totalWarnings = 0;

const candidateResults = readableRecords.map((record) => {
  const result = extractSections(record.raw_text);

  const sectionCounts = Object.fromEntries(
    SECTION_NAMES.map((section) => {
      const count = result.sections[section].length;
      sectionTotals[section] += count;
      return [section, count];
    }),
  );

  for (const warning of result.warnings) {
    totalWarnings++;

    if (
      warning.code === "missing_section" &&
      warning.section &&
      SECTION_NAMES.includes(
        warning.section as (typeof SECTION_NAMES)[number],
      )
    ) {
      missingSectionTotals[
        warning.section as (typeof SECTION_NAMES)[number]
      ]++;
    }
  }

  for (const section of SECTION_NAMES) {
    for (const item of result.sections[section]) {
      offsetChecks++;

      if (
        record.raw_text.slice(
          item.start_offset,
          item.end_offset,
        ) !== item.text
      ) {
        offsetFailures++;
      }
    }
  }

  return {
    candidate_id: record.candidate_id,
    source_file: record.source_file,
    section_counts: sectionCounts,
    missing_sections: result.warnings
      .filter((warning) => warning.code === "missing_section")
      .map((warning) => warning.section),
    warning_count: result.warnings.length,
  };
});

const report = {
  generated_at: new Date().toISOString(),
  dataset: {
    total_records: records.length,
    held_out_excluded: heldOutRecords.length,
    development_records: developmentRecords.length,
    readable_development_records: readableRecords.length,
    empty_development_records: emptyRecords.map(
      (record) => record.candidate_id,
    ),
  },
  section_line_totals: sectionTotals,
  candidates_with_missing_sections: missingSectionTotals,
  validation: {
    total_warnings: totalWarnings,
    offset_checks: offsetChecks,
    offset_failures: offsetFailures,
    offsets_valid: offsetFailures === 0,
    held_out_exclusion_verified:
      heldOutRecords.length === HELD_OUT_IDS.size &&
      candidateResults.every(
        (candidate) => !HELD_OUT_IDS.has(candidate.candidate_id),
      ),
  },
  candidates: candidateResults,
};

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify(report, null, 2));

console.log("========== SECTION VALIDATION ==========");
console.log("Total records:", report.dataset.total_records);
console.log("Held-out excluded:", report.dataset.held_out_excluded);
console.log("Development records:", report.dataset.development_records);
console.log(
  "Readable development records:",
  report.dataset.readable_development_records,
);
console.log("Empty development IDs:", report.dataset.empty_development_records);

console.log("\nSection line totals:");
console.table(sectionTotals);

console.log("Candidates with missing sections:");
console.table(missingSectionTotals);

console.log("\nOffset checks:", offsetChecks);
console.log("Offset failures:", offsetFailures);
console.log("Total warnings:", totalWarnings);
console.log(
  "Held-out exclusion verified:",
  report.validation.held_out_exclusion_verified,
);
console.log("Report saved:", OUTPUT);

if (
  offsetFailures > 0 ||
  !report.validation.held_out_exclusion_verified
) {
  process.exitCode = 1;
}
