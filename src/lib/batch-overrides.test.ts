import { describe, expect, it } from "vitest";

import {
  applyCandidateOverrides,
  validateOverrideCandidates,
  type BatchOverride,
  type EducationRecord,
} from "./batch-overrides";

const education: EducationRecord[] = [
  {
    qualification: "Master of Science",
    academic_level: "postgraduate",
    field_of_study: null,
    institution: null,
    original_text:
      "Dual M.Sc. — Renewable Energy, Energy Efficiency & Sustainability",
  },
];

const validOverride: BatchOverride = {
  candidate_id: "046",
  field: "education[0].institution",
  original: null,
  corrected:
    "Kassel University (DE), Cairo University (EG), Monastir University (TN)",
  reason:
    "The extraction placed the institution line immediately following the M.Sc. entry into a separate record. This correction associates that source line with the preceding degree entry.",
  verified_by: "Project reviewer",
  date: "2026-11-14",
};

describe("batch overrides", () => {
  it("applies a valid override to the corrected education data", () => {
    const result = applyCandidateOverrides("046", education, [validOverride]);

    expect(result.education[0].institution).toBe(validOverride.corrected);
    expect(result.appliedOverrides).toHaveLength(1);
  });

  it("preserves the original education value and source records", () => {
    const result = applyCandidateOverrides("046", education, [validOverride]);

    expect(result.originalEducation).toEqual(education);
    expect(result.originalEducation[0].institution).toBeNull();
    expect(education[0].institution).toBeNull();
  });

  it("rejects an override when its original value does not match", () => {
    const staleOverride = {
      ...validOverride,
      original: "An outdated institution",
    };

    expect(() =>
      applyCandidateOverrides("046", education, [staleOverride]),
    ).toThrow(/Original value mismatch/);
  });

  it("rejects unsupported fields, including source evidence fields", () => {
    const invalidOverride = {
      ...validOverride,
      field: "raw_text",
    };

    expect(() =>
      applyCandidateOverrides("046", education, [invalidOverride]),
    ).toThrow(/Unsupported override field/);
  });
});

describe("override candidate validation", () => {
  it("rejects overrides for candidates missing from the dataset", () => {
    expect(() =>
      validateOverrideCandidates(["001", "002"], [validOverride]),
    ).toThrow(/unknown candidate: 046/i);
  });

  it("accepts overrides whose candidate exists in the dataset", () => {
    expect(() =>
      validateOverrideCandidates(["001", "046"], [validOverride]),
    ).not.toThrow();
  });
});
