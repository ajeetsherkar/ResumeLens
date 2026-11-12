import { describe, expect, it } from "vitest";
import { scanPrivacy } from "./privacy";

describe("scanPrivacy", () => {
  it("detects and redacts email addresses", () => {
    const text = "Contact: ajeet@example.com";
    const result = scanPrivacy(text);

    expect(result.contains_email).toBe(true);
    expect(result.contains_phone).toBe(false);
    expect(result.display_text).toBe("Contact: [REDACTED_EMAIL]");
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].original_text).toBe("ajeet@example.com");
  });

  it("detects Indian mobile numbers", () => {
    const text = "Phone: 9876543210";
    const result = scanPrivacy(text);

    expect(result.contains_phone).toBe(true);
    expect(result.display_text).toBe("Phone: [REDACTED_PHONE]");
  });

  it("detects Indian numbers with country code", () => {
    const text = "Phone: +91 9876543210";
    const result = scanPrivacy(text);

    expect(result.contains_phone).toBe(true);
    expect(result.display_text).toBe("Phone: [REDACTED_PHONE]");
  });

  it("detects multiple emails and phone numbers", () => {
    const text =
      "ajeet@example.com 9876543210 contact@test.org 8765432109";

    const result = scanPrivacy(text);

    expect(result.matches).toHaveLength(4);
    expect(result.contains_email).toBe(true);
    expect(result.contains_phone).toBe(true);
    expect(result.display_text).not.toContain("ajeet@example.com");
    expect(result.display_text).not.toContain("9876543210");
    expect(result.display_text).not.toContain("contact@test.org");
    expect(result.display_text).not.toContain("8765432109");
  });

  it("does not redact ordinary years or short numeric sequences", () => {
    const text = "Graduated in 2024. Scored 95 marks. Roll number 12345.";
    const result = scanPrivacy(text);

    expect(result.matches).toHaveLength(0);
    expect(result.display_text).toBe(text);
    expect(result.contains_email).toBe(false);
    expect(result.contains_phone).toBe(false);
  });

  it("preserves exact source offsets", () => {
    const text = "Email: ajeet@example.com, Phone: 9876543210";
    const result = scanPrivacy(text);

    for (const match of result.matches) {
      expect(
        text.slice(match.start_offset, match.end_offset),
      ).toBe(match.original_text);
    }
  });

  it("does not modify the original input", () => {
    const text = "Contact ajeet@example.com at 9876543210";
    const original = text;

    scanPrivacy(text);

    expect(text).toBe(original);
  });

  it("handles text without personal contact information", () => {
    const text = "B.Tech in Artificial Intelligence and Machine Learning.";
    const result = scanPrivacy(text);

    expect(result.display_text).toBe(text);
    expect(result.matches).toEqual([]);
    expect(result.contains_email).toBe(false);
    expect(result.contains_phone).toBe(false);
  });

  it("handles empty input", () => {
    expect(scanPrivacy("")).toEqual({
      display_text: "",
      contains_email: false,
      contains_phone: false,
      matches: [],
    });
  });
});
