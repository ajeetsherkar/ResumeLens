import { describe, expect, it } from "vitest";
import { ROLE_WEIGHTS } from "../config";
import type { Candidate } from "../types";
import {
  validateCandidate,
  validateWeightTables,
} from "./validation";

const validCandidate: Candidate = {
  candidate_id: "candidate_001",
  source_file: "resume_001.docx",
  extraction_status: "success",
  extracted_text: "Python developer with relevant experience.",
  warnings: [],
  evidence: [],
  experience: {
    months_max: 12,
    attribution: "employment",
    convention: "inclusive_calendar_months",
    confidence: 0.9,
  },
  role_scores: [],
  classification: "potential_match",
};

describe("ResumeLens validation", () => {
  it("validates that each role's weights sum to 100", () => {
    expect(validateWeightTables(ROLE_WEIGHTS)).toEqual({
      valid: true,
      errors: [],
    });
  });

  it("rejects a weight table whose total is not 100", () => {
    const result = validateWeightTables({
      ExampleRole: {
        criterion_a: 40,
        criterion_b: 50,
      },
    });

    expect(result.valid).toBe(false);
  });

  it("accepts a well-formed candidate record", () => {
    expect(validateCandidate(validCandidate)).toEqual({
      valid: true,
      errors: [],
    });
  });

  it("rejects a candidate with an invalid experience estimate", () => {
    const malformedCandidate = {
      ...validCandidate,
      experience: {
        ...validCandidate.experience,
        months_max: -2,
      },
    };

    expect(validateCandidate(malformedCandidate).valid).toBe(false);
  });
});
