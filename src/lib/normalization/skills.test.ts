import { describe, expect, it } from "vitest";
import { extractSections } from "./sections";
import { normalizeSkills } from "./skills";

describe("normalizeSkills", () => {
  it("normalizes known aliases", () => {
    const resume = [
      "Skills",
      "Sima Pro, Open LCA, MS Excel, Fig Jam, Python",
    ].join("\n");

    const result = normalizeSkills(extractSections(resume));

    expect(result.map(skill => skill.canonical_name)).toEqual([
      "SimaPro",
      "openLCA",
      "Microsoft Excel",
      "FigJam",
      "Python",
    ]);

    expect(result.map(skill => skill.original_text)).toEqual([
      "Sima Pro",
      "Open LCA",
      "MS Excel",
      "Fig Jam",
      "Python",
    ]);
  });

  it("detects skills across multiple resume sections", () => {
    const resume = [
      "Skills",
      "Figma, SQL",
      "Experience",
      "Used Python and Tableau at work.",
      "Projects",
      "Built a model using Scikit-learn.",
      "Education",
      "Studied Java.",
      "Certifications",
      "TensorFlow certification",
      "Summary",
      "Experienced in Power BI.",
    ].join("\n");

    const result = normalizeSkills(extractSections(resume));

    expect(result.map(skill => skill.canonical_name)).toEqual(
      expect.arrayContaining([
        "Figma",
        "SQL",
        "Python",
        "Tableau",
        "Scikit-learn",
        "Java",
        "TensorFlow",
        "Power BI",
      ]),
    );

    expect(result).toHaveLength(8);
  });

  it("prefers the longest overlapping alias", () => {
    const resume = [
      "Skills",
      "Microsoft Excel and Excel",
    ].join("\n");

    const result = normalizeSkills(extractSections(resume));

    expect(result).toHaveLength(2);
    expect(result.map(skill => skill.original_text)).toEqual([
      "Microsoft Excel",
      "Excel",
    ]);

    expect(result.every(
      skill => skill.canonical_name === "Microsoft Excel",
    )).toBe(true);
  });

  it("does not match skills inside larger words", () => {
    const resume = [
      "Skills",
      "JavaScript, SQLAlchemy, Pythonista, SQL",
    ].join("\n");

    const result = normalizeSkills(extractSections(resume));

    expect(result).toHaveLength(1);
    expect(result[0].canonical_name).toBe("SQL");
    expect(result[0].original_text).toBe("SQL");
  });

  it("preserves exact source offsets", () => {
    const resume = [
      "Skills",
      "Figma, Python and MS Excel",
      "Experience",
      "Used Sima Pro in a project.",
    ].join("\n");

    const result = normalizeSkills(extractSections(resume));

    for (const skill of result) {
      expect(
        resume.slice(skill.start_offset, skill.end_offset),
      ).toBe(skill.original_text);
    }
  });

  it("preserves the section where each skill was found", () => {
    const resume = [
      "Skills",
      "Figma",
      "Projects",
      "Python project",
      "Education",
      "Java coursework",
    ].join("\n");

    const result = normalizeSkills(extractSections(resume));

    expect(result.map(skill => skill.section)).toEqual([
      "skills",
      "projects",
      "education",
    ]);
  });

  it("does not invent skills when none are detected", () => {
    const resume = [
      "Skills",
      "Hardworking and motivated individual",
    ].join("\n");

    expect(normalizeSkills(extractSections(resume))).toEqual([]);
  });

  it("handles an empty resume", () => {
    expect(normalizeSkills(extractSections(""))).toEqual([]);
  });
});
