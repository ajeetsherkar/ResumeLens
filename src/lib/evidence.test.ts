import { describe, expect, it } from "vitest";
import { EVIDENCE_TIER_CREDITS } from "../config";
import { extractSections } from "./normalization/sections";
import {
  assessEvidence,
  verifyEvidenceSnippet,
  type EvidenceInput,
} from "./evidence";

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

describe("assessEvidence", () => {
  it("assigns demonstrated to experience evidence", () => {
    const input = makeInput(
      "Experience\nUsed SimaPro to conduct life cycle assessment for products.",
    );
    const result = assessEvidence(input, "LCA");
    const item = result.find(x => x.criterion_id === "lca_methodology");

    expect(item?.tier).toBe("demonstrated");
  });

  it("assigns demonstrated to project evidence", () => {
    const input = makeInput(
      "Projects\nCreated an interactive Figma prototype and tested it with users.",
    );
    const result = assessEvidence(input, "UI/UX");
    const item = result.find(x => x.criterion_id === "design_tools");

    expect(item?.tier).toBe("demonstrated");
  });

  it("assigns listed_only to skills evidence", () => {
    const input = makeInput("Skills\nFigma, wireframing, user research");
    const result = assessEvidence(input, "UI/UX");
    const item = result.find(x => x.criterion_id === "user_research");

    expect(item?.tier).toBe("listed_only");
  });

  it("assigns ambiguous to summary-only evidence", () => {
    const input = makeInput(
      "Summary\nInterested in user research and product design.",
    );
    const result = assessEvidence(input, "UI/UX");
    const item = result.find(x => x.criterion_id === "user_research");

    expect(item?.tier).toBe("ambiguous");
  });

  it("assigns missing when no evidence is found", () => {
    const input = makeInput(
      "Experience\nManaged inventory and prepared monthly reports.",
    );
    const result = assessEvidence(input, "LCA");
    const item = result.find(x => x.criterion_id === "lca_software");

    expect(item?.tier).toBe("missing");
    expect(item?.snippets).toHaveLength(0);
  });

  it("assigns source_incomplete for partial extraction", () => {
    const input = makeInput("Skills\nFigma", "partial");
    const result = assessEvidence(input, "UI/UX");
    const item = result.find(x => x.criterion_id === "design_tools");

    expect(item?.tier).toBe("source_incomplete");
  });

  it("prioritizes demonstrated evidence over listed evidence", () => {
    const input = makeInput(
      "Skills\nFigma\nProjects\nBuilt a mobile prototype in Figma.",
    );
    const result = assessEvidence(input, "UI/UX");
    const item = result.find(x => x.criterion_id === "design_tools");

    expect(item?.tier).toBe("demonstrated");
  });

  it("preserves exact snippets and source offsets", () => {
    const rawText =
      "Experience\nApplied ISO 14044 principles during an LCA project.";
    const result = assessEvidence(makeInput(rawText), "LCA");
    const item = result.find(x => x.criterion_id === "lca_standards");
    const snippet = item?.snippets[0];

    expect(snippet).toBeDefined();
    expect(
      rawText.slice(snippet!.start_offset, snippet!.end_offset),
    ).toBe(snippet!.text);
    expect(rawText.includes(snippet!.text)).toBe(true);
    expect(snippet?.verified).toBe(true);
  });

  it("does not match aliases inside larger words", () => {
    const input = makeInput("Skills\nFigma-like workflow and EPDX tooling.");
    const result = assessEvidence(input, "LCA");
    const item = result.find(x => x.criterion_id === "epd");

    expect(item?.tier).toBe("missing");
  });

  it("classifies a bare ISO reference as ambiguous only for LCA standards", () => {
    const input = makeInput(
      "Experience\nUsed Figma to create a prototype.\nCertifications\nISO",
    );

    const lca = assessEvidence(input, "LCA");
    const uiux = assessEvidence(input, "UI/UX");

    const standards = lca.find(x => x.criterion_id === "lca_standards");
    const software = lca.find(x => x.criterion_id === "lca_software");
    const designTools = uiux.find(x => x.criterion_id === "design_tools");

    expect(standards?.tier).toBe("ambiguous");
    expect(standards?.snippets.some(x => x.matched_text === "ISO")).toBe(true);
    expect(software?.tier).toBe("missing");
    expect(designTools?.tier).toBe("demonstrated");
  });

  it("keeps a specific ISO standard reference section-based", () => {
    const input = makeInput(
      "Experience\nApplied ISO 14044 principles during an LCA project.",
    );

    const standards = assessEvidence(input, "LCA").find(
      x => x.criterion_id === "lca_standards",
    );

    expect(standards?.tier).toBe("demonstrated");
  });

  it("does not downgrade clean evidence because another line is truncated", () => {
    const input = makeInput(
      "Experience\nUsed GaBi for environmental analysis.\nReduced emissions by 20%,e.",
    );

    const software = assessEvidence(input, "LCA").find(
      x => x.criterion_id === "lca_software",
    );

    expect(software?.tier).toBe("demonstrated");
  });

  it("marks evidence found only on a truncated line as source_incomplete", () => {
    const input = makeInput("Experience\nUsed GaBi,e.");

    const software = assessEvidence(input, "LCA").find(
      x => x.criterion_id === "lca_software",
    );

    expect(software?.tier).toBe("source_incomplete");
  });
  it("reads credits from configuration", () => {
    const input = makeInput("Skills\nFigma");
    const result = assessEvidence(input, "UI/UX");
    const item = result.find(x => x.criterion_id === "design_tools");

    expect(item?.credit).toBe(EVIDENCE_TIER_CREDITS.listed_only);
    expect(EVIDENCE_TIER_CREDITS.source_incomplete).toBe(0);
  });
});

describe("verifyEvidenceSnippet", () => {
  it("accepts exact source substrings", () => {
    expect(
      verifyEvidenceSnippet("Used Figma for prototyping.", "Figma"),
    ).toBe(true);
  });

  it("rejects fabricated and empty snippets", () => {
    expect(
      verifyEvidenceSnippet("Used Figma for prototyping.", "Adobe XD"),
    ).toBe(false);
    expect(
      verifyEvidenceSnippet("Used Figma for prototyping.", ""),
    ).toBe(false);
  });
});
