import { QUALITY_RULE_WEIGHTS } from "../config";
import type { ExtractionStatus } from "../types";
import type { ResumeSectionName, SectionLine } from "./normalization/sections";
import type { ExtractedRole } from "./normalization/roles";
import type { ExperienceCalculationResult } from "./normalization/experience";
import type { PrivacyScanResult } from "./normalization/privacy";

export type QualityRuleId =
  | "R1" | "R2" | "R3" | "R4"
  | "R5" | "R6" | "R7" | "R8";

export type QualityIssueType =
  | "extraction_error"
  | "source_incomplete"
  | "ambiguous_evidence"
  | "privacy_flag";

export interface QualityIssue {
  rule_id: QualityRuleId;
  type: QualityIssueType;
  reason: string;
}

export interface QualityRuleResult {
  rule_id: QualityRuleId;
  fired: boolean;
  reason: string;
  issue_types: QualityIssueType[];
}

export interface QualityInput {
  raw_text: string;
  extraction_status: ExtractionStatus | "empty";
  sections: Record<ResumeSectionName, SectionLine[]>;
  roles: ExtractedRole[];
  experience: ExperienceCalculationResult;
  privacy: PrivacyScanResult;
  extraction_warnings: Array<{
    code: string;
    message: string;
  }>;
}

export interface QualityAssessment {
  rules: QualityRuleResult[];
  issues: QualityIssue[];
  confidence: number;
  review_required: boolean;
}

function result(
  rule_id: QualityRuleId,
  fired: boolean,
  reason: string,
  issue_types: QualityIssueType[] = [],
): QualityRuleResult {
  return { rule_id, fired, reason, issue_types };
}

/**
 * R1: Blank or very short extracted text.
 * A threshold of 10 characters is provisional and deterministic.
 */
export function evaluateR1(input: QualityInput): QualityRuleResult {
  const length = input.raw_text.trim().length;

  const fired =
    input.extraction_status === "empty" ||
    input.extraction_status === "failed" ||
    length <= 10;

  return result(
    "R1",
    fired,
    fired
      ? `Extraction failed or produced insufficient readable text (${length} characters).`
      : `Readable text is present (${length} characters).`,
    fired ? ["extraction_error"] : [],
  );
}

/**
 * R2: Bare ISO standards references without a specific standard number.
 * A finding creates both an ambiguity issue and a source-incomplete issue.
 */
export function evaluateR2(input: QualityInput): QualityRuleResult {
  const bareIso = /\bISO\b(?!\s*(?:14040|14044)\b)/i.test(input.raw_text);

  return result(
    "R2",
    bareIso,
    bareIso
      ? "A bare ISO reference was found without a specific standard number such as ISO 14040 or ISO 14044."
      : "No unsupported bare ISO reference was detected.",
    bareIso ? ["ambiguous_evidence", "source_incomplete"] : [],
  );
}

/**
 * R3: Detect explicit truncation markers and dangling numeric fragments.
 * The rule flags source text but never reconstructs it.
 */
export function evaluateR3(input: QualityInput): QualityRuleResult {
  const truncatedFragment = /,\s*[a-z]\./i.test(input.raw_text);
  const danglingNumber = /(?:^|\n)\s*\d{1,4}[.,]?\s*$/m.test(
    input.raw_text,
  );

  const fired = truncatedFragment || danglingNumber;

  return result(
    "R3",
    fired,
    fired
      ? "A truncated fragment or dangling number was detected. Original source text has been preserved without reconstruction."
      : "No recognized truncation marker or dangling number was detected.",
    fired ? ["source_incomplete"] : [],
  );
}

/**
 * R4: A detected role has missing, ambiguous, or unparseable dates.
 */
export function evaluateR4(input: QualityInput): QualityRuleResult {
  const affected = input.experience.roles.filter(
    role => role.dates.warning !== null,
  );

  const fired = affected.length > 0;

  return result(
    "R4",
    fired,
    fired
      ? `${affected.length} role(s) have missing, ambiguous, or unparseable dates. Experience duration remains unknown or provisional for those roles.`
      : "All detected role dates were parsed without date warnings.",
    fired ? ["source_incomplete"] : [],
  );
}

/**
 * R5: Required experience, education, or skills section is missing.
 */
export function evaluateR5(input: QualityInput): QualityRuleResult {
  const required: ResumeSectionName[] = [
    "experience",
    "education",
    "skills",
  ];

  const missing = required.filter(
    section => input.sections[section].length === 0,
  );

  const fired = missing.length > 0;

  return result(
    "R5",
    fired,
    fired
      ? `Missing or unrecognized required section(s): ${missing.join(", ")}.`
      : "Experience, education, and skills sections are present.",
    fired ? ["source_incomplete"] : [],
  );
}

/**
 * R6: Invalid or chronologically impossible role dates.
 * Ordinary overlapping employment periods are not considered impossible.
 */
export function evaluateR6(input: QualityInput): QualityRuleResult {
  const affected = input.experience.roles.filter(
    role => role.dates.warning === "invalid_date",
  );

  const fired = affected.length > 0;

  return result(
    "R6",
    fired,
    fired
      ? `${affected.length} role(s) contain invalid or chronologically impossible date ranges and require review.`
      : "No invalid or chronologically impossible role date ranges were detected.",
    fired ? ["ambiguous_evidence"] : [],
  );
}

/**
 * R7: Email or phone information detected by the privacy scanner.
 * This is reported as a privacy flag, not an extraction failure.
 */
export function evaluateR7(input: QualityInput): QualityRuleResult {
  const count = input.privacy.matches.length;
  const fired = count > 0;

  return result(
    "R7",
    fired,
    fired
      ? `${count} email or phone item(s) detected. Redact these from displayed resume text.`
      : "No email or phone patterns were detected by the privacy scanner.",
    fired ? ["privacy_flag"] : [],
  );
}

/**
 * R8: Mammoth extraction and raw-XML fallback disagreement.
 * Uses the existing extraction comparison warning.
 */
export function evaluateR8(input: QualityInput): QualityRuleResult {
  const mismatch = input.extraction_warnings.some(
    warning => warning.code === "extraction_mismatch",
  );

  return result(
    "R8",
    mismatch,
    mismatch
      ? "Mammoth extraction differs from the DOCX XML fallback. Manual extraction review is required."
      : "No Mammoth/XML extraction mismatch warning was recorded.",
    mismatch ? ["extraction_error"] : [],
  );
}

const RULES = [
  evaluateR1,
  evaluateR2,
  evaluateR3,
  evaluateR4,
  evaluateR5,
  evaluateR6,
  evaluateR7,
  evaluateR8,
] as const;

/**
 * Evaluates all eight deterministic source-quality rules.
 *
 * Confidence is:
 * 1 - (sum of fired rule weights / sum of all configured rule weights).
 *
 * Weights are provisional and should be calibrated against the assignment
 * methodology before final evaluation.
 */
export function assessSourceQuality(
  input: QualityInput,
): QualityAssessment {
  const rules = RULES.map(rule => rule(input));

  const issues: QualityIssue[] = rules.flatMap(rule =>
    rule.issue_types.map(type => ({
      rule_id: rule.rule_id,
      type,
      reason: rule.reason,
    })),
  );

  const totalWeight = Object.values(QUALITY_RULE_WEIGHTS).reduce(
    (sum, weight) => sum + weight,
    0,
  );

  const firedWeight = rules.reduce(
    (sum, rule) =>
      sum + (rule.fired ? QUALITY_RULE_WEIGHTS[rule.rule_id] : 0),
    0,
  );

  const confidence = Math.max(
    0,
    Math.min(1, 1 - firedWeight / totalWeight),
  );

  return {
    rules,
    issues,
    confidence: Number(confidence.toFixed(6)),
    review_required: rules.some(
      rule =>
        rule.fired &&
        ["R1", "R6", "R8"].includes(rule.rule_id),
    ),
  };
}
