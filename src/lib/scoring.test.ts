import { describe, expect, it } from "vitest";
import { ROLE_CRITERION_WEIGHTS } from "../config";
import { extractSections } from "./normalization/sections";
import { scoreRole } from "./scoring";
import type { EvidenceInput } from "./evidence";

function makeInput(
  rawText: string,
  status: EvidenceInput["extraction_status"] = "success",
): EvidenceInput {
  return {
    raw_text: rawText,
    sections: extractSections(rawText).sections,
    extraction_status: status,
  };
}

describe("scoreRole", () => {
  it("calculates a normalized weighted LCA score across evidence tiers", () => {
    const input = makeInput(
      [
        "Experience",
        "Conducted life cycle assessment for a manufacturing process.",
        "Used GaBi,e.",
        "Skills",
        "LCI",
        "Summary",
        "ISO",
      ].join("\n"),
    );

    const result = scoreRole(input, "LCA");
    const criterion = (id: string) =>
      result.criteria.find(item => item.criterion_id === id);

    expect(criterion("lca_methodology")?.score).toBe(20);
    expect(criterion("lci")?.score).toBe(5);
    expect(criterion("lca_standards")?.score).toBe(3.75);
    expect(criterion("lca_software")?.score).toBe(0);

    expect(criterion("lca_methodology")?.explanation).toContain(
      "demonstrated evidence",
    );
    expect(result.max_score).toBe(100);
    expect(result.total_score).toBe(28.75);
  });

  it("assigns zero credit to source-incomplete evidence", () => {
    const input = makeInput("Experience\nUsed GaBi,e.");
    const result = scoreRole(input, "LCA");
    const software = result.criteria.find(
      item => item.criterion_id === "lca_software",
    );

    expect(software?.score).toBe(0);
    expect(software?.evidence).toHaveLength(1);
    expect(software?.evidence[0]?.tier).toBe("source_incomplete");
    expect(software?.evidence[0]?.snippet).toContain("GaBi");
  });

  it("uses configured criterion weights and totals 100 per role", () => {
    for (const role of ["LCA", "UI/UX"] as const) {
      const total = Object.values(ROLE_CRITERION_WEIGHTS[role]).reduce(
        (sum, weight) => sum + weight,
        0,
      );

      expect(total).toBe(100);
    }
  });

  it("returns a score between zero and 100", () => {
    const input = makeInput(
      "Experience\nConducted life cycle assessment and applied ISO 14044.",
    );

    const result = scoreRole(input, "LCA");

    expect(result.total_score).toBeGreaterThanOrEqual(0);
    expect(result.total_score).toBeLessThanOrEqual(100);
  });

  it("does not use candidate name or institution as scoring inputs", () => {
    const evidenceInput = makeInput(
      "Experience\nConducted life cycle assessment for a product.",
    );

    const candidateA = {
      name: "Candidate A",
      institution: "University A",
      evidenceInput,
    };

    const candidateB = {
      name: "Candidate B",
      institution: "University B",
      evidenceInput,
    };

    expect(scoreRole(candidateA.evidenceInput, "LCA")).toEqual(
      scoreRole(candidateB.evidenceInput, "LCA"),
    );
  });

  it("does not depend on eligibility metadata", () => {
    const evidenceInput = makeInput(
      "Experience\nConducted life cycle assessment for a product.",
    );

    const candidateA = {
      evidenceInput,
      relocation: "yes",
      full_time_availability: "yes",
    };

    const candidateB = {
      evidenceInput,
      relocation: "no",
      full_time_availability: "unknown",
    };

    expect(scoreRole(candidateA.evidenceInput, "LCA")).toEqual(
      scoreRole(candidateB.evidenceInput, "LCA"),
    );
  });
});
