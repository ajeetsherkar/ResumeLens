import fs from "node:fs";
import {
  assessEvidence,
  type EvidenceInput,
} from "../src/lib/evidence";

interface Profile {
  candidate_id: string;
  raw_text: string;
  extraction_status: EvidenceInput["extraction_status"];
  sections: EvidenceInput["sections"];
  quality: EvidenceInput["quality"];
}

const INPUT = "data/processed/structured-profiles.json";

const HELD_OUT_IDS = new Set([
  "012", "005", "003", "031", "034", "017", "036",
]);

const records = JSON.parse(
  fs.readFileSync(INPUT, "utf8"),
) as Profile[];

const profiles = records.filter(
  profile => !HELD_OUT_IDS.has(profile.candidate_id),
);

if (records.length !== 39 || profiles.length !== 39) {
  throw new Error(
    `Expected exactly 39 development profiles; found ${profiles.length}.`,
  );
}

if (profiles.some(p => HELD_OUT_IDS.has(p.candidate_id))) {
  throw new Error("Held-out candidate detected.");
}

const tiers = {
  demonstrated: 0,
  listed_only: 0,
  ambiguous: 0,
  missing: 0,
  source_incomplete: 0,
};

let totalCriteria = 0;
let totalSnippets = 0;
let verificationFailures = 0;

for (const profile of profiles) {
  const input: EvidenceInput = {
    raw_text: profile.raw_text,
    sections: profile.sections,
    extraction_status: profile.extraction_status,
    quality: profile.quality,
  };

  for (const role of ["LCA", "UI/UX"] as const) {
    const results = assessEvidence(input, role);

    for (const result of results) {
      totalCriteria++;
      tiers[result.tier]++;

      for (const snippet of result.snippets) {
        totalSnippets++;

        const exactText = profile.raw_text.slice(
          snippet.start_offset,
          snippet.end_offset,
        );

        if (
          !snippet.verified ||
          exactText !== snippet.text ||
          !profile.raw_text.includes(snippet.text)
        ) {
          verificationFailures++;
        }
      }
    }
  }
}

if (verificationFailures > 0) {
  throw new Error(
    `${verificationFailures} evidence snippet verification failure(s).`,
  );
}

if (totalCriteria !== 39 * 18) {
  throw new Error(
    `Expected ${39 * 18} criterion assessments; got ${totalCriteria}.`,
  );
}

console.log("\n===== SESSION 4 EVIDENCE VALIDATION =====");
console.log("Development profiles:", profiles.length);
console.log("Held-out profiles excluded:", HELD_OUT_IDS.size);
console.log("Roles assessed per profile: 2");
console.log("Criterion assessments:", totalCriteria);
console.log("Verified snippets:", totalSnippets);
console.log("Snippet verification failures:", verificationFailures);
console.log("\nTier distribution:");

for (const [tier, count] of Object.entries(tiers)) {
  console.log(`${tier.padEnd(20)}: ${count}`);
}

console.log("\nHeld-out exclusion: PASSED");
console.log("Snippet integrity: PASSED");
console.log("SESSION 4 DATASET VALIDATION: PASSED");
