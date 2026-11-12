import { describe, expect, it } from "vitest";
import {
  assessSourceQuality,
  evaluateR1,
  evaluateR2,
  evaluateR3,
  evaluateR4,
  evaluateR5,
  evaluateR6,
  evaluateR7,
  evaluateR8,
  type QualityInput,
} from "./quality";
import { extractRoles } from "./normalization/roles";
import { extractSections } from "./normalization/sections";
import { calculateCandidateExperience } from "./normalization/experience";
import { scanPrivacy } from "./normalization/privacy";

function makeInput(rawText: string): QualityInput {
  const extraction = extractSections(rawText);
  const roles = extractRoles(extraction.sections.experience);

  const experience = calculateCandidateExperience(
    roles.map(role => ({
      role_title: role.role_title,
      employer: role.employer,
      original_date_text: role.original_date_text,
      description: role.description,
      attribution: role.attribution,
    })),
    "Nov 2026",
  );

  return {
    raw_text: rawText,
    extraction_status: rawText.trim().length <= 2 ? "empty" : "success",
    sections: extraction.sections,
    roles,
    experience,
    privacy: scanPrivacy(rawText),
    extraction_warnings: [],
  };
}

/**
 * Focused source fixture based on resume_046.
 * Only the R2 and R3 evidence needed for this test is reproduced.
 */
const resume046Fixture = [
  "Professional Experience",
  "Energy & Sustainability Consultant — AECOM GmbH Jun 2023 – Aug 2025",
  "Delivered a circular economy strategy for the automotive sector, reducing Scope 3 emissions by 35% and eliminating 2,e.",
  "Education",
  "Master of Science",
  "Skills",
  "Life Cycle Assessment, GaBi, openLCA",
  "Certifications & Licenses",
  "ISO",
].join("\n");

/** resume_037 fixture: the source yielded only two characters. */
const resume037Fixture = "  ";

describe("source-quality rules R1-R8", () => {
  it("R1 detects the resume_037 empty-source fixture", () => {
    const input = makeInput(resume037Fixture);
    const result = evaluateR1(input);

    expect(result.fired).toBe(true);
    expect(result.reason).toContain("insufficient readable text");
    expect(result.issue_types).toContain("extraction_error");
  });

  it("R2 detects a bare ISO reference in resume_046", () => {
    const result = evaluateR2(makeInput(resume046Fixture));

    expect(result.fired).toBe(true);
    expect(result.issue_types).toContain("ambiguous_evidence");
    expect(result.issue_types).toContain("source_incomplete");
  });

  it("does not flag a fully specified ISO standard", () => {
    const input = makeInput(
      "Experience\nConsultant — Example Jun 2023 – Aug 2025\nEducation\nMSc\nSkills\nISO 14040 and ISO 14044",
    );

    expect(evaluateR2(input).fired).toBe(false);
  });

  it("R3 detects the truncated resume_046 fragment", () => {
    const result = evaluateR3(makeInput(resume046Fixture));

    expect(result.fired).toBe(true);
    expect(result.reason).toContain("without reconstruction");
    expect(result.issue_types).toContain("source_incomplete");
  });

  it("R4 detects a role with missing dates", () => {
    const input = makeInput([
      "Experience",
      "Consultant — Example not specified",
      "Education",
      "MSc",
      "Skills",
      "Python",
    ].join("\n"));

    expect(evaluateR4(input).fired).toBe(true);
  });

  it("R5 detects missing required sections", () => {
    const input = makeInput("Professional Experience\nConsultant — Example Jun 2023 – Aug 2025");

    expect(evaluateR5(input).fired).toBe(true);
    expect(evaluateR5(input).reason).toContain("education");
    expect(evaluateR5(input).reason).toContain("skills");
  });

  it("R6 detects impossible role dates", () => {
    const input = makeInput([
      "Experience",
      "Consultant — Example 13/2025 – 01/2026",
      "Education",
      "MSc",
      "Skills",
      "Python",
    ].join("\n"));

    expect(evaluateR6(input).fired).toBe(true);
  });

  it("R7 detects privacy information", () => {
    const input = makeInput([
      "Experience",
      "Consultant — Example Jun 2023 – Aug 2025",
      "Contact: test@example.com",
      "Education",
      "MSc",
      "Skills",
      "Python",
    ].join("\n"));

    expect(evaluateR7(input).fired).toBe(true);
    expect(evaluateR7(input).issue_types).toContain("privacy_flag");
  });

  it("R8 detects the existing extraction mismatch warning", () => {
    const input = makeInput(resume046Fixture);
    input.extraction_warnings = [{
      code: "extraction_mismatch",
      message: "Mammoth and XML fallback differ.",
    }];

    expect(evaluateR8(input).fired).toBe(true);
    expect(evaluateR8(input).issue_types).toContain("extraction_error");
  });

  it("confidence is deterministic and bounded", () => {
    const input = makeInput(resume046Fixture);
    const first = assessSourceQuality(input);
    const second = assessSourceQuality(input);

    expect(first).toEqual(second);
    expect(first.confidence).toBeGreaterThanOrEqual(0);
    expect(first.confidence).toBeLessThanOrEqual(1);
  });

  it("resume_046 fixture produces R2 and R3", () => {
    const assessment = assessSourceQuality(makeInput(resume046Fixture));
    const fired = assessment.rules
      .filter(rule => rule.fired)
      .map(rule => rule.rule_id);

    expect(fired).toContain("R2");
    expect(fired).toContain("R3");
  });

  it("resume_037 fixture produces R1", () => {
    const assessment = assessSourceQuality(makeInput(resume037Fixture));
    const fired = assessment.rules
      .filter(rule => rule.fired)
      .map(rule => rule.rule_id);

    expect(fired).toContain("R1");
  });
});
