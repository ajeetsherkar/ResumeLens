import fs from "node:fs";
import path from "node:path";

import type { Warning } from "../src/types";
import {
  extractSections,
  type SectionExtraction,
} from "../src/lib/normalization/sections";
import {
  normalizeSkills,
  type NormalizedSkill,
} from "../src/lib/normalization/skills";
import {
  extractEducation,
  type EducationItem,
} from "../src/lib/normalization/education";
import { scanPrivacy } from "../src/lib/normalization/privacy";
import { extractRoles } from "../src/lib/normalization/roles";
import {
  calculateCandidateExperience,
  type ExperienceCalculationResult,
} from "../src/lib/normalization/experience";

interface ExtractedResume {
  candidate_id: string;
  source_file: string;
  extraction_status: "success" | "empty" | "failed";
  raw_text: string;
  normalized_text: string;
  warnings: Array<{
    code: string;
    message: string;
  }>;
}

interface StructuredResumeProfile {
  candidate_id: string;
  source_file: string;
  extraction_status: string;
  raw_text: string;
  display_text: string;
  sections: SectionExtraction["sections"];
  skills: NormalizedSkill[];
  education: EducationItem[];
  experience: ExperienceCalculationResult;
  privacy: {
    contains_email: boolean;
    contains_phone: boolean;
    email_count: number;
    phone_count: number;
  };
  warnings: Warning[];
}

const INPUT = "data/processed/extracted.json";
const OUTPUT = "data/processed/structured-profiles.json";
const REPORT = "data/processed/profile-validation-report.json";

const HELD_OUT_IDS = new Set([
  "012",
  "005",
  "003",
  "031",
  "034",
  "017",
  "036",
]);

const EXPECTED_TOTAL = 46;
const EXPECTED_DEVELOPMENT = 39;


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

function main() {
  if (!fs.existsSync(INPUT)) {
    throw new Error(`Input dataset not found: ${INPUT}`);
  }

  const records = JSON.parse(
    fs.readFileSync(INPUT, "utf8"),
  ) as ExtractedResume[];

  if (records.length !== EXPECTED_TOTAL) {
    throw new Error(
      `Expected ${EXPECTED_TOTAL} records, found ${records.length}.`,
    );
  }

  const ids = records.map(record => record.candidate_id);

  if (new Set(ids).size !== ids.length) {
    throw new Error("Duplicate candidate IDs detected.");
  }

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

  if (developmentRecords.length !== EXPECTED_DEVELOPMENT) {
    throw new Error(
      `Expected ${EXPECTED_DEVELOPMENT} development records, found ${developmentRecords.length}.`,
    );
  }

  const profiles: StructuredResumeProfile[] =
    developmentRecords.map(record => {
      const rawText = record.raw_text ?? "";

      const privacyResult = scanPrivacy(rawText);

      const sectionResult = extractSections(rawText);

      const skills = normalizeSkills(sectionResult);

      const education = extractEducation(
        sectionResult.sections.education,
      );
      const extractedRoles = extractRoles(
        sectionResult.sections.experience,
      );
      const experience = calculateCandidateExperience(
        extractedRoles.map(role => ({
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

      return {
        candidate_id: record.candidate_id,
        source_file: record.source_file,
        extraction_status: record.extraction_status,
        raw_text: rawText,
        display_text: privacyResult.display_text,
        sections: sectionResult.sections,
        skills,
        education,
        experience,
        privacy: {
          contains_email: privacyResult.contains_email,
          contains_phone: privacyResult.contains_phone,
          email_count: privacyResult.matches.filter(
            match => match.type === "email",
          ).length,
          phone_count: privacyResult.matches.filter(
            match => match.type === "phone",
          ).length,
        },
        warnings,
      };
    });

  let offsetChecks = 0;
  let offsetFailures = 0;

  for (const profile of profiles) {
    const original = records.find(
      record => record.candidate_id === profile.candidate_id,
    );

    if (!original) {
      throw new Error(
        `Original record missing for ${profile.candidate_id}.`,
      );
    }

    const checkOffset = (
      start: number,
      end: number,
      expected: string,
    ) => {
      offsetChecks++;

      if (original.raw_text.slice(start, end) !== expected) {
        offsetFailures++;
      }
    };

    for (const lines of Object.values(profile.sections)) {
      for (const line of lines) {
        checkOffset(
          line.start_offset,
          line.end_offset,
          line.text,
        );
      }
    }

    for (const skill of profile.skills) {
      checkOffset(
        skill.start_offset,
        skill.end_offset,
        skill.original_text,
      );
    }

    for (const item of profile.education) {
      checkOffset(
        item.start_offset,
        item.end_offset,
        item.original_text,
      );
    }
  }

  if (offsetFailures > 0) {
    throw new Error(
      `Offset validation failed: ${offsetFailures}/${offsetChecks}.`,
    );
  }

  const report = {
    generated_at: new Date().toISOString(),
    dataset: {
      total_records: records.length,
      held_out_excluded: heldOutRecords.length,
      development_profiles: profiles.length,
      readable_profiles: profiles.filter(
        profile => profile.extraction_status === "success",
      ).length,
      empty_profiles: profiles.filter(
        profile => profile.extraction_status === "empty",
      ).length,
      held_out_exclusion_verified: profiles.every(
        profile => !HELD_OUT_IDS.has(profile.candidate_id),
      ),
    },
    totals: {
      skills: profiles.reduce(
        (sum, profile) => sum + profile.skills.length,
        0,
      ),
      education_items: profiles.reduce(
        (sum, profile) => sum + profile.education.length,
        0,
      ),
      extracted_roles: profiles.reduce(
        (sum, profile) => sum + profile.experience.roles.length,
        0,
      ),
      profiles_with_experience: profiles.filter(
        profile => profile.experience.total_experience_months_max !== null,
      ).length,
      profiles_with_lca_experience: profiles.filter(
        profile => profile.experience.lca_experience_months_max !== null,
      ).length,
      profiles_with_email: profiles.filter(
        profile => profile.privacy.contains_email,
      ).length,
      profiles_with_phone: profiles.filter(
        profile => profile.privacy.contains_phone,
      ).length,
      warnings: profiles.reduce(
        (sum, profile) => sum + profile.warnings.length,
        0,
      ),
    },
    validation: {
      offset_checks: offsetChecks,
      offset_failures: offsetFailures,
      passed: offsetFailures === 0,
    },
  };

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });

  fs.writeFileSync(
    OUTPUT,
    JSON.stringify(profiles, null, 2),
    "utf8",
  );

  fs.writeFileSync(
    REPORT,
    JSON.stringify(report, null, 2),
    "utf8",
  );

  console.log("\n===== STRUCTURED PROFILE SUMMARY =====");
  console.log(`Original records       : ${records.length}`);
  console.log(`Held-out excluded      : ${heldOutRecords.length}`);
  console.log(`Development profiles   : ${profiles.length}`);
  console.log(`Readable profiles      : ${report.dataset.readable_profiles}`);
  console.log(`Empty profiles         : ${report.dataset.empty_profiles}`);
  console.log(`Total skills           : ${report.totals.skills}`);
  console.log(`Education items        : ${report.totals.education_items}`);
  console.log(`Extracted roles         : ${report.totals.extracted_roles}`);
  console.log(`Profiles with experience: ${report.totals.profiles_with_experience}`);
  console.log(`Profiles with LCA       : ${report.totals.profiles_with_lca_experience}`);
  console.log(`Profiles with emails   : ${report.totals.profiles_with_email}`);
  console.log(`Profiles with phones   : ${report.totals.profiles_with_phone}`);
  console.log(`Total warnings         : ${report.totals.warnings}`);
  console.log(`Offset checks          : ${offsetChecks}`);
  console.log(`Offset failures        : ${offsetFailures}`);
  console.log(`Held-out exclusion     : ${report.dataset.held_out_exclusion_verified}`);
  console.log(`Profiles output        : ${OUTPUT}`);
  console.log(`Validation report      : ${REPORT}`);
}

main();
