
import { describe, expect, it } from "vitest";

import {
  calculateCandidateExperience,
  calculateRoleExperience,
  mergeExperiencePeriods,
  parseExperienceDateRange,
} from "./experience";

const REFERENCE_DATE = "Nov 2026";

describe("parseExperienceDateRange", () => {
  it("parses abbreviated month names", () => {
    const result = parseExperienceDateRange(
      "Sep 2021 - Jun 2023",
      REFERENCE_DATE,
    );

    expect(result.normalized_start).toBe("2021-09");
    expect(result.normalized_end).toBe("2023-06");
    expect(result.precision).toBe("month");
    expect(result.warning).toBeNull();

    expect(
      result.end_month_index! - result.start_month_index!,
    ).toBe(21);
  });

  it("parses full month names", () => {
    const result = parseExperienceDateRange(
      "September 2021 - June 2023",
      REFERENCE_DATE,
    );

    expect(result.normalized_start).toBe("2021-09");
    expect(result.normalized_end).toBe("2023-06");
    expect(result.warning).toBeNull();
  });

  it("preserves year-only dates and calculates their upper bound", () => {
    const result = parseExperienceDateRange(
      "2021 - 2023",
      REFERENCE_DATE,
    );

    expect(result.precision).toBe("year");
    expect(result.normalized_start).toBe("2021-01");
    expect(result.normalized_end).toBe("2023-12");

    expect(
      result.end_month_index! - result.start_month_index!,
    ).toBe(35);
  });

  it.each(["Present", "Current", "Ongoing"])(
    "recognizes %s as an ongoing end date",
    (endDate) => {
      const result = parseExperienceDateRange(
        `Sep 2021 - ${endDate}`,
        REFERENCE_DATE,
      );

      expect(result.is_current).toBe(true);
      expect(result.normalized_start).toBe("2021-09");
      expect(result.normalized_end).toBe("2026-11");
      expect(result.warning).toBeNull();
    },
  );

  it("preserves the original date text", () => {
    const original = "September 2021 - June 2023";

    const result = parseExperienceDateRange(
      original,
      REFERENCE_DATE,
    );

    expect(result.original_text).toBe(original);
  });

  it("returns a missing-date warning for empty dates", () => {
    const result = parseExperienceDateRange(
      "",
      REFERENCE_DATE,
    );

    expect(result.warning).toBe("missing_date");
    expect(result.start_month_index).toBeNull();
    expect(result.end_month_index).toBeNull();
  });

  it("returns an invalid-date warning for garbage dates", () => {
    const result = parseExperienceDateRange(
      "not-a-real-date",
      REFERENCE_DATE,
    );

    expect(result.warning).toBe("invalid_date");
    expect(result.start_month_index).toBeNull();
  });

  it("rejects an end date before the start date", () => {
    const result = parseExperienceDateRange(
      "Jun 2023 - Sep 2021",
      REFERENCE_DATE,
    );

    expect(result.warning).toBe("invalid_date");
  });
});

describe("mergeExperiencePeriods", () => {
  it("merges overlapping periods without double-counting", () => {
    const result = mergeExperiencePeriods([
      {
        original_start: "Jan 2020",
        original_end: "Jan 2022",
        start_month_index: 2020 * 12,
        end_month_index: 2022 * 12,
        attribution: "employment",
      },
      {
        original_start: "Jan 2021",
        original_end: "Jan 2023",
        start_month_index: 2021 * 12,
        end_month_index: 2023 * 12,
        attribution: "employment",
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].months_max).toBe(36);
  });

  it("does not merge separate non-overlapping periods", () => {
    const result = mergeExperiencePeriods([
      {
        original_start: "Jan 2020",
        original_end: "Jan 2021",
        start_month_index: 2020 * 12,
        end_month_index: 2021 * 12,
        attribution: "employment",
      },
      {
        original_start: "Jan 2022",
        original_end: "Jan 2023",
        start_month_index: 2022 * 12,
        end_month_index: 2023 * 12,
        attribution: "employment",
      },
    ]);

    expect(result).toHaveLength(2);
    expect(result.reduce((sum, p) => sum + p.months_max, 0))
      .toBe(24);
  });
});

describe("calculateRoleExperience", () => {
  it("credits explicit LCA evidence in the TA Europe role", () => {
    const result = calculateRoleExperience(
      {
        role_title:
          "Senior Consultant — Energy Efficiency & Sustainability",
        employer: "TA Europe GmbH",
        original_date_text: "Sept 2021 - Jun 2023",
        description:
          "Led circular economy research and cradle-to-grave LCA analysis across real estate and logistics portfolios.",
        attribution: "employment",
      },
      REFERENCE_DATE,
    );

    expect(result.lca_experience_months_max).toBe(21);
    expect(result.dates.warning).toBeNull();
    expect(result.attribution_text).toContain("Explicit");
    expect(result.confidence).toBe(0.9);
  });

  it("does not credit general sustainability work at AECOM as LCA", () => {
    const result = calculateRoleExperience(
      {
        role_title: "Energy & Sustainability Consultant",
        employer: "AECOM GmbH",
        original_date_text: "Jun 2023 - Aug 2025",
        description: [
          "Conducted supply chain decarbonisation research.",
          "Designed a circular economy strategy.",
          "Conducted biodiversity impact assessments.",
        ].join(" "),
        attribution: "employment",
      },
      REFERENCE_DATE,
    );

    expect(result.lca_experience_months_max).toBeNull();
    expect(result.attribution_text).toContain("unknown");
    expect(result.confidence).toBe(0);
  });

  it("does not treat a bare ISO reference as LCA evidence", () => {
    const result = calculateRoleExperience(
      {
        role_title: "Consultant",
        original_date_text: "Jan 2020 - Jan 2022",
        description: "Worked with ISO standards.",
      },
      REFERENCE_DATE,
    );

    expect(result.lca_experience_months_max).toBeNull();
  });

  it("does not credit LCA skills listed outside the role description", () => {
    const result = calculateRoleExperience(
      {
        role_title: "Energy Consultant",
        original_date_text: "Jan 2020 - Jan 2022",
        description: "Conducted energy efficiency research.",
      },
      REFERENCE_DATE,
    );

    expect(result.lca_experience_months_max).toBeNull();
  });
});

describe("partial experience dates", () => {
  it("parses abbreviated partial dates", () => {
    const result = parseExperienceDateRange(
      "Jun - Jul 2024",
      REFERENCE_DATE,
    );

    expect(result.normalized_start).toBe("2024-06");
    expect(result.normalized_end).toBe("2024-07");
    expect(result.warning).toBe("ambiguous_date");
  });

  it("parses full month partial dates", () => {
    const result = parseExperienceDateRange(
      "June - August 2025",
      REFERENCE_DATE,
    );

    expect(result.normalized_start).toBe("2025-06");
    expect(result.normalized_end).toBe("2025-08");
  });

  it("preserves missing dates represented as null", () => {
    const result = parseExperienceDateRange(
      "null",
      REFERENCE_DATE,
    );

    expect(result.warning).toBe("missing_date");
  });

  it("does not incorrectly split October", () => {
    const result = parseExperienceDateRange(
      "October 2023 to Present",
      REFERENCE_DATE,
    );

    expect(result.normalized_start).toBe("2023-10");
    expect(result.normalized_end).toBe("2026-11");
    expect(result.is_current).toBe(true);
  });
});

describe("additional resume date formats", () => {
  it("parses two-digit years", () => {
    const result = parseExperienceDateRange(
      "Sep '25 - Dec '25",
      REFERENCE_DATE,
    );

    expect(result.normalized_start).toBe("2025-09");
    expect(result.normalized_end).toBe("2025-12");
  });

  it("preserves duration-only experience", () => {
    const result = parseExperienceDateRange(
      "8 Months",
      REFERENCE_DATE,
    );

    expect(result.stated_duration_months).toBe(8);
    expect(result.start_month_index).toBeNull();
    expect(result.warning).toBe("ambiguous_date");
  });

  it("recognizes unspecified dates", () => {
    const result = parseExperienceDateRange(
      "Not specified",
      REFERENCE_DATE,
    );

    expect(result.warning).toBe("missing_date");
  });

  it("does not invent dates for ongoing roles without a start date", () => {
    const result = parseExperienceDateRange(
      "Ongoing",
      REFERENCE_DATE,
    );

    expect(result.start_month_index).toBeNull();
    expect(result.end_month_index).toBeNull();
    expect(result.warning).toBe("missing_date");
  });
});

describe("calculateCandidateExperience", () => {
  it("merges employment periods and calculates LCA separately", () => {
    const result = calculateCandidateExperience(
      [
        {
          role_title: "LCA Consultant",
          employer: "TA Europe",
          original_date_text: "Sep 2021 - Jun 2023",
          description: "Performed cradle-to-grave LCA analysis.",
          attribution: "employment",
        },
        {
          role_title: "Sustainability Consultant",
          employer: "AECOM",
          original_date_text: "Jun 2023 - Aug 2025",
          description: "Performed biodiversity assessments.",
          attribution: "employment",
        },
      ],
      REFERENCE_DATE,
    );

    expect(result.roles).toHaveLength(2);
    expect(result.total_experience_months_max).toBe(47);
    expect(result.lca_experience_months_max).toBe(21);
  });

  it("does not count project periods as professional employment", () => {
    const result = calculateCandidateExperience(
      [
        {
          role_title: "Independent Project",
          original_date_text: "Jan 2022 - Jan 2023",
          description: "Performed LCA analysis.",
          attribution: "project",
        },
      ],
      REFERENCE_DATE,
    );

    expect(result.total_experience_months_max).toBeNull();
    expect(result.lca_experience_months_max).toBe(12);
  });
});

describe("experience warning and LCA evidence regression", () => {
  it("recognizes explicit life cycle analysis wording", () => {
    const result = calculateRoleExperience(
      {
        role_title: "LCA Consultant",
        employer: "Example",
        original_date_text: "Sep 2021 - Jun 2023",
        description: "Conducted life cycle analysis for industrial products.",
        attribution: "employment",
      },
      REFERENCE_DATE,
    );

    expect(result.lca_experience_months_max).toBe(21);
  });

  it("preserves ambiguous date warnings at candidate level", () => {
    const result = calculateCandidateExperience(
      [
        {
          role_title: "Developer",
          original_date_text: "Jun - Jul 2024",
          description: "Software development.",
          attribution: "employment",
        },
      ],
      REFERENCE_DATE,
    );

    expect(result.warnings).toContain("Developer: ambiguous_date");
  });
});

describe("numeric month/year experience dates", () => {
  it("parses numeric month/year ranges", () => {
    const result = parseExperienceDateRange(
      "11/2025 - 01/2026",
      REFERENCE_DATE,
    );

    expect(result.normalized_start).toBe("2025-11");
    expect(result.normalized_end).toBe("2026-01");
    expect(result.end_month_index! - result.start_month_index!).toBe(2);
    expect(result.warning).toBeNull();
  });

  it("rejects invalid numeric months", () => {
    const result = parseExperienceDateRange(
      "13/2025 - 01/2026",
      REFERENCE_DATE,
    );

    expect(result.warning).toBe("invalid_date");
    expect(result.start_month_index).toBeNull();
  });
});
