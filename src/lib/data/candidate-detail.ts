
import fs from "node:fs";
import path from "node:path";

import {
  CLASSIFICATION_RULES,
} from "@/config";

import type {
  Classification,
  EvidenceTier,
  EligibilityStatus,
} from "@/types";

type Role = "LCA" | "UI/UX";

type RawSnippet = {
  text?: string;
  matched_text?: string;
  section?: string;
  start_offset?: number;
  end_offset?: number;
  verified?: boolean;
};

type RawEvidence = {
  criterion_id: string;
  criterion_label: string;
  role: Role;
  tier: EvidenceTier;
  matched_aliases: string[];
  snippets: RawSnippet[];
  credit: number;
  reason: string;
};

type RawCriterion = {
  criterion_id: string;
  score: number;
  max_score: number;
  evidence: {
    tier: EvidenceTier;
    snippet: string;
    section: string;
  }[];
  explanation: string;
};

type RawCandidate = {
  candidate_id: string;
  source_confidence: number;
  review_required: boolean;
  source_file?: string;
  extraction_status?: string;
  experience: {
    total_experience_months_max: number | null;
    lca_experience_months_max: number | null;
  };
  eligibility: {
    relocation: EligibilityStatus;
    full_time_availability: EligibilityStatus;
  };
  warnings: {
    code: string;
    message: string;
    section?: string;
  }[];
  role_results: Record<
    Role,
    {
      score: {
        role_id: Role;
        total_score: number;
        max_score: number;
        criteria: RawCriterion[];
      };
      classification: Classification;
      evidence: RawEvidence[];
    }
  >;
};

type RawProfile = {
  candidate_id: string;
  extraction_status: string;
  display_text?: string;
  privacy?: {
    contains_email?: boolean;
    contains_phone?: boolean;
  };
  skills: {
    canonical_name: string;
    original_text: string;
    section: string;
  }[];
  education: {
    qualification: string | null;
    academic_level: string;
    field_of_study: string | null;
    institution: string | null;
    original_text: string;
  }[];
  experience: {
    roles: {
      role_title: string;
      employer: string | null;
      dates: {
        original_text: string | null;
        warning: string | null;
        is_current: boolean;
      };
      confidence: number;
    }[];
    total_experience_months_max: number | null;
    lca_experience_months_max: number | null;
    month_counting_convention: string;
    warnings: string[];
  };
  sections: Record<
    string,
    {
      text: string;
    }[]
  >;
  quality: {
    confidence: number;
    review_required: boolean;
    issues: {
      rule_id: string;
      type: string;
      reason: string;
    }[];
  };
  warnings: {
    code: string;
    message: string;
    section?: string;
  }[];
};

export type CandidateWarning = {
  type: "extraction_error" | "source_incomplete" | "ambiguous_evidence" | "other";
  code: string;
  message: string;
  section?: string;
};

export type CandidateCriterionDetail = {
  criterionId: string;
  label: string;
  weight: number;
  points: number;
  credit: number;
  tier: EvidenceTier;
  explanation: string;
  evidence: {
    id: string;
    text: string;
    matchedText: string;
    section: string;
    start: number | null;
    end: number | null;
    criterionId: string;
    criterionLabel: string;
    role: Role;
    verified: boolean;
  }[];
};

export type CandidateRoleDetail = {
  role: Role;
  score: number;
  maxScore: number;
  classification: Classification;
  classificationExplanation: string;
  criteria: CandidateCriterionDetail[];
};

export type CandidateDetail = {
  candidateId: string;
  extractionStatus: string;
  sourceConfidence: number;
  reviewRequired: boolean;
  experience: {
    totalMonths: number | null;
    lcaMonths: number | null;
    monthCountingConvention: string;
    roles: {
      title: string;
      employer: string | null;
      dateText: string | null;
      dateWarning: string | null;
      confidence: number;
    }[];
  };
  education: {
    qualification: string | null;
    academicLevel: string;
    fieldOfStudy: string | null;
    institution: string | null;
    originalText: string;
  }[];
  skills: {
    name: string;
    originalText: string;
    section: string;
  }[];
  projects: string[];
  certifications: string[];
  eligibility: {
    relocation: EligibilityStatus;
    fullTimeAvailability: EligibilityStatus;
  };
  roles: Record<Role, CandidateRoleDetail>;
  warnings: CandidateWarning[];
  quality: {
    confidence: number;
    reviewRequired: boolean;
  };
  source: {
    available: boolean;
    text: string;
    message: string;
  };
  sourceDocument: {
    available: boolean;
    message: string;
  };
  overrides: {
    applied: false;
    message: string;
  };
};

const dataDirectory = path.join(process.cwd(), "data", "processed");

function readJson<T>(filename: string): T {
  const filePath = path.join(dataDirectory, filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Required candidate data is missing: ${filename}`);
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

/**
 * Remove email addresses and phone-like sequences from displayed excerpts.
 * Raw resume text and source filenames are never returned.
 */
function sanitizeText(value: string): string {
  return value
    .replace(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      "[email hidden]",
    )
    .replace(
      /(?:\+?\d[\d\s().-]{7,}\d)/g,
      "[phone hidden]",
    )
    .trim();
}

function warningType(
  type: string,
): CandidateWarning["type"] {
  if (
    type === "extraction_error" ||
    type === "source_incomplete" ||
    type === "ambiguous_evidence"
  ) {
    return type;
  }

  return "other";
}

function buildWarnings(
  candidate: RawCandidate,
  profile: RawProfile,
): CandidateWarning[] {
  const warnings: CandidateWarning[] = [];

  for (const issue of profile.quality.issues ?? []) {
    warnings.push({
      type: warningType(issue.type),
      code: issue.rule_id,
      message: issue.reason,
    });
  }

  for (const warning of candidate.warnings ?? []) {
    const type =
      warning.code === "missing_section"
        ? "source_incomplete"
        : warning.code === "low_quality_extraction" ||
            warning.code === "extraction_mismatch"
          ? "extraction_error"
          : "other";

    warnings.push({
      type,
      code: warning.code,
      message: warning.message,
      ...(warning.section ? { section: warning.section } : {}),
    });
  }

  for (const warning of profile.warnings ?? []) {
    const type =
      warning.code === "missing_section"
        ? "source_incomplete"
        : warning.code === "low_quality_extraction" ||
            warning.code === "extraction_mismatch"
          ? "extraction_error"
          : "other";

    warnings.push({
      type,
      code: warning.code,
      message: warning.message,
      ...(warning.section ? { section: warning.section } : {}),
    });
  }

  const unique = new Map<string, CandidateWarning>();

  for (const warning of warnings) {
    const key = [
      warning.type,
      warning.code,
      warning.message,
      warning.section ?? "",
    ].join("|");

    unique.set(key, warning);
  }

  return [...unique.values()];
}

function classificationExplanation(
  classification: Classification,
  score: number,
  sourceConfidence: number,
  reviewRequired: boolean,
): string {
  if (reviewRequired) {
    return "Manual review is required. This review flag takes precedence over score thresholds.";
  }

  if (
    sourceConfidence <
    CLASSIFICATION_RULES.minimum_source_confidence
  ) {
    return `Source confidence (${sourceConfidence.toFixed(2)}) is below the provisional minimum of ${CLASSIFICATION_RULES.minimum_source_confidence.toFixed(2)}.`;
  }

  switch (classification) {
    case "strong_match":
      return `Score ${score.toFixed(1)} meets the provisional strong-match threshold of ${CLASSIFICATION_RULES.strong_match_min_score}.`;

    case "potential_match":
      return `Score ${score.toFixed(1)} meets the provisional potential-match threshold of ${CLASSIFICATION_RULES.potential_match_min_score}, but is below ${CLASSIFICATION_RULES.strong_match_min_score}.`;

    case "not_a_match":
      return `Score ${score.toFixed(1)} is below the provisional potential-match threshold of ${CLASSIFICATION_RULES.potential_match_min_score}.`;

    case "needs_review":
      return "The classification requires manual review under the configured rules.";

    default:
      return "Classification follows the configured screening rules.";
  }
}

function buildRoleDetail(
  role: Role,
  result: RawCandidate["role_results"][Role],
  sourceConfidence: number,
  reviewRequired: boolean,
): CandidateRoleDetail {
  const evidenceByCriterion = new Map(
    result.evidence.map((item) => [item.criterion_id, item]),
  );

  const criteria = result.score.criteria.map((criterion) => {
    const evidence = evidenceByCriterion.get(criterion.criterion_id);

    const snippets = (evidence?.snippets ?? []).map((snippet, index) => ({
      id: `${role}:${criterion.criterion_id}:${index}`,
      text: sanitizeText(snippet.text ?? ""),
      matchedText: sanitizeText(snippet.matched_text ?? ""),
      section: snippet.section ?? "unknown",
      start:
        Number.isInteger(snippet.start_offset) ? snippet.start_offset! : null,
      end:
        Number.isInteger(snippet.end_offset) ? snippet.end_offset! : null,
      criterionId: criterion.criterion_id,
      criterionLabel:
        evidence?.criterion_label ??
        criterion.criterion_id.replaceAll("_", " "),
      role,
      verified: snippet.verified === true,
    }));

    return {
      criterionId: criterion.criterion_id,
      label:
        evidence?.criterion_label ??
        criterion.criterion_id.replaceAll("_", " "),
      weight: criterion.max_score,
      points: criterion.score,
      credit: evidence?.credit ?? 0,
      tier: evidence?.tier ?? "missing",
      explanation: criterion.explanation,
      evidence: snippets,
    };
  });

  return {
    role,
    score: result.score.total_score,
    maxScore: result.score.max_score,
    classification: result.classification,
    classificationExplanation: classificationExplanation(
      result.classification,
      result.score.total_score,
      sourceConfidence,
      reviewRequired,
    ),
    criteria,
  };
}

function sectionTexts(
  profile: RawProfile,
  section: string,
): string[] {
  return (profile.sections[section] ?? [])
    .map((item) =>
      sanitizeText(item.text ?? "").replace(/^[\\s•·▪‣]+/, "").trim(),
    )
    .filter(Boolean);
}

export function getCandidateDetail(
  candidateId: string,
): CandidateDetail | null {
  if (!/^\d{3,}$/.test(candidateId)) {
    return null;
  }

  const candidates = readJson<RawCandidate[]>("candidates.json");
  const profiles = readJson<RawProfile[]>("structured-profiles.json");

  const candidate = candidates.find(
    (item) => item.candidate_id === candidateId,
  );

  const profile = profiles.find(
    (item) => item.candidate_id === candidateId,
  );

  if (!candidate || !profile) {
    return null;
  }

  const sourceConfidence = candidate.source_confidence;
  const reviewRequired = candidate.review_required;

  const displayedSource = profile.display_text ?? "";
  const sourcePrivacyClear =
    profile.privacy?.contains_email === false &&
    profile.privacy?.contains_phone === false;
  const sourceAvailable =
    displayedSource.length > 0 && sourcePrivacyClear;

  const sourceMessage = sourceAvailable
    ? "Extracted resume text. Highlighted passages are verified evidence linked to screening criteria."
    : !displayedSource
      ? "Extracted resume text is unavailable for this candidate."
      : "Source text is hidden because its privacy checks are incomplete or detected personal contact details.";

  return {
    candidateId: candidate.candidate_id,
    extractionStatus: profile.extraction_status,
    sourceConfidence,
    reviewRequired,

    experience: {
      totalMonths: profile.experience.total_experience_months_max,
      lcaMonths: profile.experience.lca_experience_months_max,
      monthCountingConvention:
        profile.experience.month_counting_convention,
      roles: profile.experience.roles.map((role) => ({
        title: sanitizeText(role.role_title),
        employer: role.employer
          ? sanitizeText(role.employer)
          : null,
        dateText: role.dates.original_text,
        dateWarning: role.dates.warning,
        confidence: role.confidence,
      })),
    },

    education: profile.education.map((item) => ({
      qualification: item.qualification,
      academicLevel: item.academic_level,
      fieldOfStudy: item.field_of_study,
      institution: item.institution
        ? sanitizeText(item.institution)
        : null,
      originalText: sanitizeText(item.original_text),
    })),

    skills: Array.from(
      new Map(
        profile.skills.map((skill) => [
          skill.canonical_name.trim().toLocaleLowerCase(),
          {
            name: skill.canonical_name,
            originalText: sanitizeText(skill.original_text),
            section: skill.section,
          },
        ]),
      ).values(),
    ),

    projects: sectionTexts(profile, "projects"),
    certifications: sectionTexts(profile, "certifications"),

    eligibility: {
      relocation: candidate.eligibility.relocation,
      fullTimeAvailability:
        candidate.eligibility.full_time_availability,
    },

    roles: {
      LCA: buildRoleDetail(
        "LCA",
        candidate.role_results.LCA,
        sourceConfidence,
        reviewRequired,
      ),
      "UI/UX": buildRoleDetail(
        "UI/UX",
        candidate.role_results["UI/UX"],
        sourceConfidence,
        reviewRequired,
      ),
    },

    warnings: buildWarnings(candidate, profile),

    quality: {
      confidence: profile.quality.confidence,
      reviewRequired: profile.quality.review_required,
    },

    source: {
      available: sourceAvailable,
      text: sourceAvailable ? displayedSource : "",
      message: sourceMessage,
    },
    sourceDocument: {
      available: false,
      message:
        "Original DOCX file is not available in the configured resume storage.",
    },

    overrides: {
      applied: false,
      message: "Manual override management is not implemented.",
    },
  };
}
