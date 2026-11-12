import { describe, expect, it } from "vitest";
import { extractRoles } from "./roles";
import type { SectionLine } from "./sections";

function makeLines(texts: string[]): SectionLine[] {
  let offset = 0;

  return texts.map(text => {
    const line = {
      text,
      start_offset: offset,
      end_offset: offset + text.length,
    };

    offset += text.length + 1;
    return line;
  });
}

describe("extractRoles", () => {
  it("extracts the three roles and LCA evidence from resume_046 format", () => {
    const lines = makeLines([
      "Energy & Sustainability Consultant — AECOM GmbH   Jun 2023 – Aug 2025",
      "• Conducted research on industrial supply chain decarbonisation.",
      "• Designed a circular economy strategy.",
      "Senior Consultant — Energy Efficiency & Sustainability — TA Europe GmbH   Sept 2021 – Jun 2023",
      "• Led circular economy research and cradle-to-grave LCA analysis across real estate and logistics portfolios.",
      "• Developed ESG reporting outputs.",
      "Scientific Research Assistant — Fraunhofer UMSICHT   Mar 2019 – Sept 2021",
      "• Designed and evaluated biomass energy technologies.",
    ]);

    const roles = extractRoles(lines);

    expect(roles).toHaveLength(3);

    expect(roles[0].role_title).toBe("Energy & Sustainability Consultant");
    expect(roles[0].employer).toBe("AECOM GmbH");
    expect(roles[0].original_date_text).toBe("Jun 2023 – Aug 2025");
    expect(roles[0].attribution).toBe("employment");

    expect(roles[1].role_title).toBe(
      "Senior Consultant — Energy Efficiency & Sustainability",
    );
    expect(roles[1].employer).toBe("TA Europe GmbH");
    expect(roles[1].original_date_text).toBe("Sept 2021 – Jun 2023");
    expect(roles[1].description).toContain("cradle-to-grave LCA analysis");

    expect(roles[2].role_title).toBe("Scientific Research Assistant");
    expect(roles[2].employer).toBe("Fraunhofer UMSICHT");
    expect(roles[2].attribution).toBe("employment");
  });

  it("recognizes ongoing-only headings without inventing a start date", () => {
    const roles = extractRoles(
      makeLines(["ESG & Sustainability Professional — PwC Ongoing"]),
    );

    expect(roles).toHaveLength(1);
    expect(roles[0].original_date_text).toBe("Ongoing");
    expect(roles[0].warnings).toContain("missing_start_date");
  });

  it("preserves missing dates on role headings", () => {
    const roles = extractRoles(
      makeLines(["UI/UX Design Collaboration — Nyx UI null"]),
    );

    expect(roles).toHaveLength(1);
    expect(roles[0].original_date_text).toBe("null");
    expect(roles[0].warnings).toContain("missing_date");
  });

  it("classifies project management internships as internships", () => {
    const roles = extractRoles(
      makeLines([
        "Project Management Intern — Excelerate Mar 2025 – Apr 2025",
      ]),
    );

    expect(roles).toHaveLength(1);
    expect(roles[0].attribution).toBe("internship");
  });

  it("does not treat ordinary bullet lines as role headings", () => {
    const roles = extractRoles(
      makeLines([
        "UI/UX Designer — Example Studio Jan 2024 – Jun 2024",
        "• Designed a dashboard for internal users.",
        "• Improved the onboarding flow.",
      ]),
    );

    expect(roles).toHaveLength(1);
    expect(roles[0].description).toContain("Designed a dashboard");
    expect(roles[0].description).toContain("Improved the onboarding flow");
  });

  it("preserves source offsets for headings and descriptions", () => {
    const lines = makeLines([
      "UI/UX Designer — Example Studio Jan 2024 – Jun 2024",
      "• Designed a dashboard.",
    ]);

    const roles = extractRoles(lines);

    expect(roles[0].start_offset).toBe(lines[0].start_offset);
    expect(roles[0].end_offset).toBe(lines[1].end_offset);
    expect(roles[0].description_lines[0].start_offset).toBe(
      lines[1].start_offset,
    );
  });
});

describe("additional role date formats", () => {
  it("recognizes curly-apostrophe two-digit years", () => {
    const roles = extractRoles(
      makeLines(["Product Designer — Lemmino Sep ’25 – Dec ’25"]),
    );

    expect(roles).toHaveLength(1);
    expect(roles[0].original_date_text).toBe("Sep ’25 – Dec ’25");
  });

  it("recognizes numeric month/year date ranges", () => {
    const roles = extractRoles(
      makeLines([
        "Sustainability Consultant — Accurec GmbH 11/2025 – 01/2026",
      ]),
    );

    expect(roles).toHaveLength(1);
    expect(roles[0].original_date_text).toBe("11/2025 – 01/2026");
  });
});
