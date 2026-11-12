export type ExtractionStatus =
  | "pending"
  | "success"
  | "partial"
  | "failed";

export type WarningCode =
  | "missing_section"
  | "low_quality_extraction"
  | "extraction_mismatch"
  | "ambiguous_date"
  | "overlapping_experience"
  | "unsupported_format"
  | "other";

export interface Warning {
  code: WarningCode;
  message: string;
  section?: string;
}

export type EvidenceTier =
  | "demonstrated"
  | "listed_only"
  | "ambiguous"
  | "missing"
  | "source_incomplete";

export interface EvidenceItem {
  tier: EvidenceTier;
  snippet: string;
  section: string;
  start_offset: number;
  end_offset: number;
  source_quality?: number;
}

export interface CriterionScore {
  criterion_id: string;
  score: number;
  max_score: number;
  evidence: EvidenceItem[];
  explanation: string;
}

export interface RoleScore {
  role_id: string;
  total_score: number;
  max_score: number;
  criteria: CriterionScore[];
}

export type Classification =
  | "strong_match"
  | "potential_match"
  | "not_a_match"
  | "needs_review";

export type ExperienceAttribution =
  | "employment"
  | "internship"
  | "project"
  | "education"
  | "unknown";

export type MonthCountingConvention =
  | "inclusive_calendar_months"
  | "elapsed_months";

export interface ExperienceEstimate {
  months_max: number;
  attribution: ExperienceAttribution;
  convention: MonthCountingConvention;
  confidence: number;
}

export interface Candidate {
  candidate_id: string;
  source_file: string;
  extraction_status: ExtractionStatus;
  extracted_text: string;
  warnings: Warning[];
  evidence: EvidenceItem[];
  experience: ExperienceEstimate;
  role_scores: RoleScore[];
  classification: Classification;
}
