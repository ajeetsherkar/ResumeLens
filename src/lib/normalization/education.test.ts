import { describe, expect, it } from "vitest";
import { extractSections } from "./sections";
import { extractEducation } from "./education";

describe("extractEducation", () => {
  it("recognizes undergraduate qualifications", () => {
    const resume = [
      "Education",
      "B.Tech in Artificial Intelligence and Machine Learning",
      "B.E. in Mechanical Engineering",
      "B.Sc. in Computer Science",
      "B.Des. in Design",
      "BCA",
    ].join("\n");

    const lines = extractSections(resume).sections.education;
    const result = extractEducation(lines);

    expect(result.map(item => item.qualification)).toEqual([
      "Bachelor of Technology",
      "Bachelor of Engineering",
      "Bachelor of Science",
      "Bachelor of Design",
      "Bachelor of Computer Applications",
    ]);

    expect(result.every(
      item => item.academic_level === "undergraduate",
    )).toBe(true);
  });

  it("recognizes postgraduate qualifications", () => {
    const resume = [
      "Education",
      "M.Tech in Computer Science",
      "M.E. in Mechanical Engineering",
      "M.Sc. in Mathematics",
      "MBA in Management",
      "MCA",
    ].join("\n");

    const result = extractEducation(
      extractSections(resume).sections.education,
    );

    expect(result.map(item => item.qualification)).toEqual([
      "Master of Technology",
      "Master of Engineering",
      "Master of Science",
      "Master of Business Administration",
      "Master of Computer Applications",
    ]);

    expect(result.every(
      item => item.academic_level === "postgraduate",
    )).toBe(true);
  });

  it("detects school and diploma qualifications", () => {
    const resume = [
      "Education",
      "HSC - 12th Standard",
      "SSC - 10th Standard",
      "Diploma in Mechanical Engineering",
    ].join("\n");

    const result = extractEducation(
      extractSections(resume).sections.education,
    );

    expect(result.map(item => item.academic_level)).toEqual([
      "school",
      "school",
      "diploma",
    ]);
  });

  it("normalizes recognized fields of study", () => {
    const resume = [
      "Education",
      "B.Tech in Artificial Intelligence and Machine Learning",
      "B.E. in Mechanical Engineering",
      "B.Sc. in Computer Science",
      "B.Tech in Information Technology",
    ].join("\n");

    const result = extractEducation(
      extractSections(resume).sections.education,
    );

    expect(result.map(item => item.field_of_study)).toEqual([
      "Artificial Intelligence and Machine Learning",
      "Mechanical Engineering",
      "Computer Science",
      "Information Technology",
    ]);
  });

  it("keeps institution lines separate from qualifications", () => {
    const resume = [
      "Education",
      "Bachelor of Technology in Computer Science",
      "Example Institute of Technology",
    ].join("\n");

    const result = extractEducation(
      extractSections(resume).sections.education,
    );

    expect(result[0].qualification).toBe("Bachelor of Technology");
    expect(result[0].institution).toBeNull();
    expect(result[0].line_type).toBe("qualification");

    expect(result[1].qualification).toBeNull();
    expect(result[1].institution).toBe(
      "Example Institute of Technology",
    );
    expect(result[1].line_type).toBe("institution");
  });

  it("does not treat ambiguous BE, ME or IT words as qualifications or fields", () => {
    const resume = [
      "Education",
      "I want to be a good engineer.",
      "Tell me about it.",
    ].join("\n");

    const result = extractEducation(
      extractSections(resume).sections.education,
    );

    expect(result.every(item => item.qualification === null)).toBe(true);
    expect(result.every(item => item.field_of_study === null)).toBe(true);
    expect(result.every(item => item.academic_level === "unknown")).toBe(true);
  });

  it("preserves exact source text and offsets", () => {
    const resume = [
      "Education",
      "  B.Tech in AIML  ",
      "Example University",
    ].join("\r\n");

    const result = extractEducation(
      extractSections(resume).sections.education,
    );

    for (const item of result) {
      expect(
        resume.slice(item.start_offset, item.end_offset),
      ).toBe(item.original_text);
    }
  });

  it("does not infer missing qualifications or fields", () => {
    const resume = [
      "Education",
      "Example University",
      "Completed coursework successfully",
    ].join("\n");

    const result = extractEducation(
      extractSections(resume).sections.education,
    );

    expect(result.every(item => item.qualification === null)).toBe(true);
    expect(result.every(item => item.field_of_study === null)).toBe(true);
  });

  it("handles an empty education section", () => {
    expect(extractEducation([])).toEqual([]);
  });
});
