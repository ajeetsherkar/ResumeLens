import { describe, expect, it } from "vitest";
import {
  buildHighlightSegments,
  type EvidenceRange,
} from "./source-highlights";

const source = "Python and machine learning projects.";

function evidence(
  id: string,
  start: number,
  end: number,
  criterionId = "technical_skills",
  role: "LCA" | "UI/UX" = "LCA",
): EvidenceRange {
  return {
    id,
    start,
    end,
    text: source.slice(start, end),
    criterionId,
    criterionLabel: criterionId,
    role,
    verified: true,
  };
}

describe("buildHighlightSegments", () => {
  it("returns no segments when evidence is missing", () => {
    expect(buildHighlightSegments(source, [])).toEqual([]);
  });

  it("highlights a verified range exactly", () => {
    const result = buildHighlightSegments(source, [
      evidence("e1", 0, 6),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]?.text).toBe("Python");
    expect(result[0]?.evidenceIds).toEqual(["e1"]);
  });

  it("merges overlapping ranges without duplicating source characters", () => {
    const result = buildHighlightSegments(source, [
      evidence("e1", 0, 11, "python"),
      evidence("e2", 7, 21, "machine_learning", "UI/UX"),
    ]);

    expect(result.map((item) => item.text)).toEqual([
      "Python ",
      "and ",
      "machine le",
    ]);

    expect(result[1]?.evidenceIds).toEqual(["e1", "e2"]);
    expect(result[1]?.roles).toEqual(["LCA", "UI/UX"]);
  });

  it("preserves repeated evidence as separate source occurrences", () => {
    const repeatedSource = "Python and Python";
    const result = buildHighlightSegments(repeatedSource, [
      {
        ...evidence("first", 0, 6),
        text: "Python",
      },
      {
        ...evidence("second", 11, 17),
        text: "Python",
      },
    ]);

    expect(result).toHaveLength(2);
    expect(result.map((item) => item.start)).toEqual([0, 11]);
  });

  it("rejects mismatched, invalid and unverified evidence", () => {
    const result = buildHighlightSegments(source, [
      evidence("valid", 0, 6),
      { ...evidence("mismatch", 7, 11), text: "wrong" },
      { ...evidence("unverified", 0, 6), verified: false },
      { ...evidence("invalid", -1, 6) },
      { ...evidence("out-of-bounds", 0, 999) },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]?.evidenceIds).toEqual(["valid"]);
  });

  it("retains criterion and role links across overlaps", () => {
    const result = buildHighlightSegments(source, [
      evidence("e1", 0, 11, "python", "LCA"),
      evidence("e2", 7, 21, "machine_learning", "UI/UX"),
    ]);

    const shared = result.find((item) => item.start === 7);

    expect(shared?.criterionIds).toEqual([
      "python",
      "machine_learning",
    ]);
    expect(shared?.roles).toEqual(["LCA", "UI/UX"]);
  });

  it("does not include text outside verified ranges", () => {
    const result = buildHighlightSegments(source, [
      evidence("e1", 0, 6),
    ]);

    expect(result.reduce((sum, item) => sum + item.text.length, 0))
      .toBe(6);
  });
});
