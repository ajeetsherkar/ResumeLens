import fs from "node:fs";
import {
  assessSourceQuality,
  type QualityInput,
} from "../src/lib/quality";
import { extractRoles } from "../src/lib/normalization/roles";
import { scanPrivacy } from "../src/lib/normalization/privacy";
import type { SectionExtraction } from "../src/lib/normalization/sections";
import type { ExperienceCalculationResult } from "../src/lib/normalization/experience";

interface Profile {
  candidate_id: string;
  extraction_status: "success" | "empty" | "failed";
  raw_text: string;
  sections: SectionExtraction["sections"];
  experience: ExperienceCalculationResult;
  warnings: Array<{ code: string; message: string }>;
}

const profiles = JSON.parse(
  fs.readFileSync("data/processed/structured-profiles.json", "utf8"),
) as Profile[];

const heldOut = new Set([
  "012", "005", "003", "031", "034", "017", "036",
]);

if (profiles.length !== 39 || profiles.some(p => heldOut.has(p.candidate_id))) {
  throw new Error("Development dataset or held-out exclusion check failed.");
}

for (const id of ["046", "037"]) {
  const profile = profiles.find(p => p.candidate_id === id);

  if (!profile) {
    throw new Error(`resume_${id} not found.`);
  }

  const roles = extractRoles(profile.sections.experience);

  const input: QualityInput = {
    raw_text: profile.raw_text,
    extraction_status: profile.extraction_status,
    sections: profile.sections,
    roles,
    experience: profile.experience,
    privacy: scanPrivacy(profile.raw_text),
    extraction_warnings: profile.warnings,
  };

  const assessment = assessSourceQuality(input);
  const fired = assessment.rules
    .filter(rule => rule.fired)
    .map(rule => rule.rule_id);

  console.log(`\n=== resume_${id} ===`);
  console.log("Fired rules:", fired);
  console.log("Confidence:", assessment.confidence);
  console.log("Review required:", assessment.review_required);
  console.log("Issues:", assessment.issues.map(issue => ({
    rule: issue.rule_id,
    type: issue.type,
  })));

  if (id === "046" && (!fired.includes("R2") || !fired.includes("R3"))) {
    throw new Error("resume_046 must trigger R2 and R3.");
  }

  if (id === "037" && !fired.includes("R1")) {
    throw new Error("resume_037 must trigger R1.");
  }
}

console.log("\nActual fixture validation PASSED.");
console.log("Held-out exclusion check PASSED.");
