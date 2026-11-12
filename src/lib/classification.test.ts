import { describe, expect, it } from "vitest";
import { CLASSIFICATION_RULES } from "../config";
import { classifyRole } from "./classification";

describe("classifyRole", () => {
  it.each([
    [75, "strong_match"],
    [90, "strong_match"],
    [74.99, "potential_match"],
    [50, "potential_match"],
    [49.99, "not_a_match"],
    [0, "not_a_match"],
  ] as const)("classifies score %s as %s", (score, expected) => {
    expect(
      classifyRole({ score, sourceConfidence: 1 }),
    ).toBe(expected);
  });

  it("requires review below the minimum source confidence", () => {
    expect(
      classifyRole({ score: 90, sourceConfidence: 0.59 }),
    ).toBe("needs_review");
  });

  it("does not require review at the exact confidence threshold", () => {
    expect(
      classifyRole({
        score: 90,
        sourceConfidence: CLASSIFICATION_RULES.minimum_source_confidence,
      }),
    ).toBe("strong_match");
  });

  it("requires review when the explicit review flag is set", () => {
    expect(
      classifyRole({
        score: 90,
        sourceConfidence: 1,
        reviewRequired: true,
      }),
    ).toBe("needs_review");
  });

  it("keeps classification independent of eligibility metadata", () => {
    const candidateA = {
      score: 80,
      sourceConfidence: 1,
      relocation: "yes",
      full_time_availability: "yes",
    };

    const candidateB = {
      score: 80,
      sourceConfidence: 1,
      relocation: "no",
      full_time_availability: "unknown",
    };

    expect(
      classifyRole({
        score: candidateA.score,
        sourceConfidence: candidateA.sourceConfidence,
      }),
    ).toBe(
      classifyRole({
        score: candidateB.score,
        sourceConfidence: candidateB.sourceConfidence,
      }),
    );
  });

  it.each([
    Number.NaN,
    Number.POSITIVE_INFINITY,
    -1,
    100.01,
  ])("rejects invalid score %s", score => {
    expect(() =>
      classifyRole({ score, sourceConfidence: 1 }),
    ).toThrow();
  });

  it.each([
    Number.NaN,
    Number.POSITIVE_INFINITY,
    -0.01,
    1.01,
  ])("rejects invalid source confidence %s", sourceConfidence => {
    expect(() =>
      classifyRole({ score: 50, sourceConfidence }),
    ).toThrow();
  });
});
