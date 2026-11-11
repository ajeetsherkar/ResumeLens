import fs from "node:fs";
import path from "node:path";
import { extractSections } from "../src/lib/normalization/sections";
import { normalizeSkills } from "../src/lib/normalization/skills";
import type { ResumeSectionName } from "../src/lib/normalization/sections";

interface ExtractedResume {
  candidate_id: string;
  source_file: string;
  extraction_status: string;
  raw_text: string;
}

const INPUT = "data/processed/extracted.json";
const OUTPUT = "data/processed/skill-validation-report.json";

const HELD_OUT_IDS = new Set([
  "012",
  "005",
  "003",
  "031",
  "034",
  "017",
  "036",
]);

const records = JSON.parse(
  fs.readFileSync(INPUT, "utf8"),
) as ExtractedResume[];

const heldOutRecords = records.filter(
  record => HELD_OUT_IDS.has(record.candidate_id),
);

if (heldOutRecords.length !== HELD_OUT_IDS.size) {
  throw new Error(
    `Expected ${HELD_OUT_IDS.size} held-out records, found ${heldOutRecords.length}.`,
  );
}

const developmentRecords = records.filter(
  record => !HELD_OUT_IDS.has(record.candidate_id),
);

const emptyRecords = developmentRecords.filter(
  record => !record.raw_text?.trim(),
);

const readableRecords = developmentRecords.filter(
  record => Boolean(record.raw_text?.trim()),
);

const skillFrequency: Record<string, number> = {};
const sectionSkillTotals: Record<ResumeSectionName, number> = {
  skills: 0,
  experience: 0,
  projects: 0,
  education: 0,
  certifications: 0,
  summary: 0,
};

const candidatesWithSkills: string[] = [];
let totalSkillMentions = 0;
let offsetChecks = 0;
let offsetFailures = 0;

const candidateResults = readableRecords.map(record => {
  const extraction = extractSections(record.raw_text);
  const skills = normalizeSkills(extraction);

  if (skills.length > 0) {
    candidatesWithSkills.push(record.candidate_id);
  }

  for (const skill of skills) {
    totalSkillMentions++;

    skillFrequency[skill.canonical_name] =
      (skillFrequency[skill.canonical_name] ?? 0) + 1;

    sectionSkillTotals[skill.section]++;

    offsetChecks++;

    if (
      record.raw_text.slice(
        skill.start_offset,
        skill.end_offset,
      ) !== skill.original_text
    ) {
      offsetFailures++;
    }
  }

  return {
    candidate_id: record.candidate_id,
    extraction_status: record.extraction_status,
    detected_skill_count: skills.length,
    detected_skills: skills.map(skill => ({
      canonical_name: skill.canonical_name,
      original_text: skill.original_text,
      section: skill.section,
    })),
  };
});

const sortedSkillFrequency = Object.fromEntries(
  Object.entries(skillFrequency).sort(
    ([, a], [, b]) => b - a,
  ),
);

const uniqueSkillCount = Object.keys(skillFrequency).length;

const heldOutExclusionVerified =
  heldOutRecords.length === HELD_OUT_IDS.size &&
  candidateResults.every(
    candidate => !HELD_OUT_IDS.has(candidate.candidate_id),
  );

const report = {
  generated_at: new Date().toISOString(),

  dataset: {
    total_records: records.length,
    held_out_excluded: heldOutRecords.length,
    development_records: developmentRecords.length,
    readable_development_records: readableRecords.length,
    empty_development_records: emptyRecords.map(
      record => record.candidate_id,
    ),
  },

  results: {
    candidates_with_detected_skills: candidatesWithSkills.length,
    candidates_without_detected_skills:
      readableRecords.length - candidatesWithSkills.length,
    total_skill_mentions: totalSkillMentions,
    unique_canonical_skills: uniqueSkillCount,
    skill_frequency: sortedSkillFrequency,
    section_skill_totals: sectionSkillTotals,
  },

  validation: {
    offset_checks: offsetChecks,
    offset_failures: offsetFailures,
    offsets_valid: offsetFailures === 0,
    held_out_exclusion_verified: heldOutExclusionVerified,
  },

  candidates: candidateResults,
};

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify(report, null, 2));

console.log("========== SKILL VALIDATION ==========");

console.log("Total records:", report.dataset.total_records);
console.log("Held-out excluded:", report.dataset.held_out_excluded);
console.log("Development records:", report.dataset.development_records);
console.log(
  "Readable development records:",
  report.dataset.readable_development_records,
);
console.log(
  "Empty development IDs:",
  report.dataset.empty_development_records,
);

console.log("\nSkill results:");
console.log(
  "Candidates with skills:",
  report.results.candidates_with_detected_skills,
);
console.log(
  "Candidates without skills:",
  report.results.candidates_without_detected_skills,
);
console.log("Total skill mentions:", totalSkillMentions);
console.log("Unique canonical skills:", uniqueSkillCount);

console.log("\nSkill frequency:");
console.table(sortedSkillFrequency);

console.log("Skills by resume section:");
console.table(sectionSkillTotals);

console.log("\nOffset checks:", offsetChecks);
console.log("Offset failures:", offsetFailures);
console.log(
  "Held-out exclusion verified:",
  heldOutExclusionVerified,
);

console.log("Report saved:", OUTPUT);

if (
  offsetFailures > 0 ||
  !heldOutExclusionVerified
) {
  process.exitCode = 1;
}
