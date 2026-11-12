import fs from "node:fs";
import path from "node:path";

import type {
  CandidateEligibility,
  Warning,
} from "../src/types";

import { assessEvidence } from "../src/lib/evidence";
import { scoreRole } from "../src/lib/scoring";
import { classifyRole } from "../src/lib/classification";
import type { EvidenceRole } from "../src/lib/evidence-dictionary";
import type { EvidenceInput } from "../src/lib/evidence";
import type { QualityAssessment } from "../src/lib/quality";

interface StructuredProfile {
  candidate_id: string;
  source_file: string;
  extraction_status: EvidenceInput["extraction_status"];
  raw_text: string;
  sections: EvidenceInput["sections"];
  experience: {
    total_experience_months_max: number | null;
    lca_experience_months_max: number | null;
  };
  quality: QualityAssessment;
  warnings: Warning[];
}

interface BuiltCandidate {
  candidate_id: string;
  source_file: string;
  source_confidence: number;
  review_required: boolean;
  experience: {
    total_experience_months_max: number | null;
    lca_experience_months_max: number | null;
  };
  eligibility: CandidateEligibility;
  role_results: Record<
    EvidenceRole,
    {
      score: ReturnType<typeof scoreRole>;
      classification: ReturnType<typeof classifyRole>;
      evidence: ReturnType<typeof assessEvidence>;
    }
  >;
  warnings: Warning[];
}

const INPUT = "data/processed/structured-profiles.json";
const OUTPUT = "data/processed/candidates.json";

const HELD_OUT_IDS = new Set([
  "012", "005", "003", "031", "034", "017", "036",
]);

const ROLES: EvidenceRole[] = ["LCA", "UI/UX"];

function main() {
  if (!fs.existsSync(INPUT)) {
    throw new Error(`Input dataset not found: ${INPUT}`);
  }

  const profiles = JSON.parse(
    fs.readFileSync(INPUT, "utf8"),
  ) as StructuredProfile[];

  const ids = profiles.map(profile => profile.candidate_id);

  if (new Set(ids).size !== ids.length) {
    throw new Error("Duplicate candidate IDs detected.");
  }

  if (profiles.some(profile => HELD_OUT_IDS.has(profile.candidate_id))) {
    throw new Error("Held-out candidate found in development profiles.");
  }

  if (profiles.length !== 39) {
    throw new Error(`Expected 39 development profiles; found ${profiles.length}.`);
  }

  const candidates: BuiltCandidate[] = profiles.map(profile => {
    const evidenceInput: EvidenceInput = {
      raw_text: profile.raw_text,
      sections: profile.sections,
      extraction_status: profile.extraction_status,
      quality: profile.quality,
    };

    const roleResults = {} as BuiltCandidate["role_results"];

    for (const role of ROLES) {
      const evidence = assessEvidence(evidenceInput, role);
      const score = scoreRole(evidenceInput, role);

      const classification = classifyRole({
        score: score.total_score,
        sourceConfidence: profile.quality.confidence,
        reviewRequired: profile.quality.review_required,
      });

      roleResults[role] = {
        score,
        classification,
        evidence,
      };
    }

    return {
      candidate_id: profile.candidate_id,
      source_file: profile.source_file,
      source_confidence: profile.quality.confidence,
      review_required: profile.quality.review_required,
      experience: {
        total_experience_months_max:
          profile.experience.total_experience_months_max,
        lca_experience_months_max:
          profile.experience.lca_experience_months_max,
      },
      eligibility: {
        relocation: "unknown",
        full_time_availability: "unknown",
      },
      role_results: roleResults,
      warnings: profile.warnings,
    };
  });

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(candidates, null, 2), "utf8");

  const summary = {
    candidates: candidates.length,
    held_out_excluded: HELD_OUT_IDS.size,
    role_assessments: candidates.length * ROLES.length,
    lca_scores: candidates.filter(c => c.role_results.LCA.score).length,
    uiux_scores: candidates.filter(c => c.role_results["UI/UX"].score).length,
    eligibility_unknown: candidates.filter(
      c => c.eligibility.relocation === "unknown" &&
        c.eligibility.full_time_availability === "unknown",
    ).length,
    output: OUTPUT,
  };

  console.log("===== CANDIDATE DATASET BUILD =====");
  console.log(JSON.stringify(summary, null, 2));

  if (candidates.length !== 39) {
    throw new Error("Candidate dataset count validation failed.");
  }

  if (!candidates.every(candidate =>
    candidate.eligibility.relocation === "unknown" &&
    candidate.eligibility.full_time_availability === "unknown"
  )) {
    throw new Error("Eligibility defaults validation failed.");
  }

  console.log("CANDIDATE DATASET BUILD: PASSED");
}

main();
