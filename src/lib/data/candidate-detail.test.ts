import { describe, expect, it } from "vitest";

import { getCandidateDetail } from "./candidate-detail";

describe("getCandidateDetail", () => {
  it("returns details for an existing candidate", async () => {
    const detail = await getCandidateDetail("001");

    expect(detail).not.toBeNull();
    expect(detail?.candidateId).toBe("001");
    expect(detail?.roles.LCA).toBeDefined();
    expect(detail?.roles["UI/UX"]).toBeDefined();
  });

  it("returns both role scores and classifications", async () => {
    const detail = await getCandidateDetail("002");

    expect(detail?.roles.LCA.score).toBeGreaterThanOrEqual(0);
    expect(detail?.roles["UI/UX"].score).toBeGreaterThanOrEqual(0);
    expect(detail?.roles.LCA.classification).toBeDefined();
    expect(detail?.roles["UI/UX"].classification).toBeDefined();
  });

  it("preserves criterion weights, points, credits and explanations", async () => {
    const detail = await getCandidateDetail("002");
    const criterion = detail?.roles["UI/UX"].criteria[0];

    expect(criterion).toBeDefined();
    expect(criterion?.weight).toBeGreaterThan(0);
    expect(criterion?.points).toBeGreaterThanOrEqual(0);
    expect(criterion?.credit).toBeGreaterThanOrEqual(0);
    expect(criterion?.explanation.length).toBeGreaterThan(0);
  });

  it("includes evidence snippets when available", async () => {
    const detail = await getCandidateDetail("004");
    const criterion = detail?.roles["UI/UX"].criteria.find(
      (item) => item.evidence.length > 0,
    );

    expect(criterion).toBeDefined();
    expect(criterion?.evidence[0]?.text.length).toBeGreaterThan(0);
    expect(criterion?.evidence[0]?.section).toBeTruthy();
  });

  it("returns empty arrays for unavailable project and certification sections", async () => {
    const detail = await getCandidateDetail("001");

    expect(detail?.projects).toEqual([]);
    expect(detail?.certifications).toEqual([]);
  });

  it("preserves unknown eligibility instead of assuming yes or no", async () => {
    const detail = await getCandidateDetail("001");

    expect(detail?.eligibility).toEqual({
      relocation: "unknown",
      fullTimeAvailability: "unknown",
    });
  });

  it("returns null for malformed or unknown candidate IDs", async () => {
    await expect(getCandidateDetail("../001")).resolves.toBeNull();
    await expect(getCandidateDetail("abc")).resolves.toBeNull();
    await expect(getCandidateDetail("999999")).resolves.toBeNull();
  });

  it("does not expose raw resume text, source filenames or contact fields", async () => {
    const detail = await getCandidateDetail("004");
    const serialized = JSON.stringify(detail);

    expect(serialized).not.toContain("raw_text");
    expect(serialized).not.toContain("display_text");
    expect(serialized).not.toContain("source_file");
    expect(serialized).not.toContain("contains_email");
    expect(serialized).not.toContain("contains_phone");
  });

  it("reports source documents as unavailable rather than inventing a link", async () => {
    const detail = await getCandidateDetail("001");

    expect(detail?.sourceDocument.available).toBe(false);
    expect(detail?.sourceDocument.message).toContain("not available");
  });

  it("makes the unimplemented override state explicit", async () => {
    const detail = await getCandidateDetail("001");

    expect(detail?.overrides.applied).toBe(false);
    expect(detail?.overrides.message).toContain("not implemented");
  });
});
