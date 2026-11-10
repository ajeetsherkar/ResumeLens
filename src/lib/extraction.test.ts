import { describe, expect, it } from "vitest";

import { extractDocx, normalizeWhitespace } from "./extraction";

describe("ResumeLens DOCX extraction", () => {
  describe("normalizeWhitespace", () => {
    it("normalizes whitespace without changing words", () => {
      const input = "  Python\tDeveloper \r\n AI  Engineer  ";

      expect(normalizeWhitespace(input)).toBe(
        "Python Developer\nAI Engineer",
      );
    });

    it("normalizes non-breaking spaces", () => {
      expect(normalizeWhitespace("Machine\u00a0Learning")).toBe(
        "Machine Learning",
      );
    });

    it("preserves paragraph separation", () => {
      expect(normalizeWhitespace("First paragraph\n\nSecond paragraph")).toBe(
        "First paragraph\n\nSecond paragraph",
      );
    });
  });

  describe("extractDocx", () => {
    it("rejects unsupported file types", async () => {
      const file = new File(["not a DOCX"], "resume.pdf", {
        type: "application/pdf",
      });

      await expect(extractDocx(file)).rejects.toThrow(
        "Unsupported file type. Please select a .docx file.",
      );
    });
  });
});
