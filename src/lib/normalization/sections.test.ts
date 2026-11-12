import { describe, expect, it } from "vitest";
import { extractSections } from "./sections";

describe("extractSections", () => {
  it("extracts all six recognized sections", () => {
    const sample = [
      "Professional Summary",
      "Product designer with UX experience.",
      "Education",
      "Bachelor of Design",
      "Experience",
      "UI/UX Designer at Company A",
      "Core Skills",
      "Figma, Prototyping",
      "Projects / Deliverables",
      "Portfolio Website",
      "Certifications & Licenses",
      "Google UX Design Certificate",
    ].join("\n");

    const result = extractSections(sample);

    expect(result.sections.summary).toHaveLength(1);
    expect(result.sections.education).toHaveLength(1);
    expect(result.sections.experience).toHaveLength(1);
    expect(result.sections.skills).toHaveLength(1);
    expect(result.sections.projects).toHaveLength(1);
    expect(result.sections.certifications).toHaveLength(1);
    expect(result.warnings).toHaveLength(0);
  });

  it("recognizes alternative section headings", () => {
    const sample = [
      "Work History",
      "Software Engineer",
      "Academic Background",
      "Bachelor of Engineering",
      "Technical Expertise",
      "Python, SQL",
      "Selected Projects",
      "ML Prediction System",
      "Professional Certifications",
      "AWS Certificate",
      "Career Objective",
      "Seeking an AI engineering role.",
    ].join("\n");

    const result = extractSections(sample);

    expect(result.sections.experience).toHaveLength(1);
    expect(result.sections.education).toHaveLength(1);
    expect(result.sections.skills).toHaveLength(1);
    expect(result.sections.projects).toHaveLength(1);
    expect(result.sections.certifications).toHaveLength(1);
    expect(result.sections.summary).toHaveLength(1);
  });

  it("reports missing sections without throwing", () => {
    const result = extractSections([
      "Education",
      "Bachelor of Engineering",
    ].join("\n"));

    expect(result.sections.education).toHaveLength(1);
    expect(result.warnings.map(warning => warning.section)).toEqual(
      expect.arrayContaining([
        "experience",
        "skills",
        "projects",
        "certifications",
        "summary",
      ]),
    );
  });

  it("preserves exact offsets with CRLF line endings", () => {
    const sample = [
      "Experience",
      "  Software Engineer  ",
      "Awards / Honors",
      "Best Project Award",
      "Education",
      "Bachelor of Engineering",
    ].join("\r\n");

    const result = extractSections(sample);

    for (const section of Object.values(result.sections)) {
      for (const item of section) {
        expect(
          sample.slice(item.start_offset, item.end_offset),
        ).toBe(item.text);
      }
    }

    expect(result.sections.experience[0].text).toBe(
      "Software Engineer",
    );
    expect(result.sections.education[0].text).toBe(
      "Bachelor of Engineering",
    );
  });

  it("preserves exact offsets with LF line endings", () => {
    const sample = [
      "Professional Summary",
      "AI/ML student",
      "Skills",
      "Python, Java",
    ].join("\n");

    const result = extractSections(sample);

    expect(
      sample.slice(
        result.sections.summary[0].start_offset,
        result.sections.summary[0].end_offset,
      ),
    ).toBe("AI/ML student");

    expect(
      sample.slice(
        result.sections.skills[0].start_offset,
        result.sections.skills[0].end_offset,
      ),
    ).toBe("Python, Java");
  });

  it("stops collecting content at an unrelated recognized heading", () => {
    const sample = [
      "Experience",
      "Software Engineer",
      "Awards / Honors",
      "Best Project Award",
      "Education",
      "Bachelor of Engineering",
    ].join("\n");

    const result = extractSections(sample);

    expect(result.sections.experience).toHaveLength(1);
    expect(result.sections.experience[0].text).toBe(
      "Software Engineer",
    );
    expect(
      result.sections.experience.some(item =>
        item.text.includes("Best Project Award"),
      ),
    ).toBe(false);
  });

  it("handles empty input", () => {
    const result = extractSections("");

    for (const section of Object.values(result.sections)) {
      expect(section).toHaveLength(0);
    }

    expect(result.warnings).toHaveLength(6);
  });
});
