export type PrivacyMatchType = "email" | "phone";

export interface PrivacyMatch {
  type: PrivacyMatchType;
  original_text: string;
  start_offset: number;
  end_offset: number;
}

export interface PrivacyScanResult {
  display_text: string;
  contains_email: boolean;
  contains_phone: boolean;
  matches: PrivacyMatch[];
}

const EMAIL_PATTERN =
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

const PHONE_PATTERN =
  /(?<!\d)(?:\+?91[\s.-]?)?[6-9]\d{4}[\s.-]?\d{5}(?!\d)/g;

export function scanPrivacy(text: string): PrivacyScanResult {
  const matches: PrivacyMatch[] = [];

  const patterns: Array<{
    type: PrivacyMatchType;
    pattern: RegExp;
  }> = [
    { type: "email", pattern: EMAIL_PATTERN },
    { type: "phone", pattern: PHONE_PATTERN },
  ];

  for (const { type, pattern } of patterns) {
    // Create a fresh regex so repeated calls are deterministic.
    const regex = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const originalText = match[0];

      matches.push({
        type,
        original_text: originalText,
        start_offset: match.index,
        end_offset: match.index + originalText.length,
      });
    }
  }

  matches.sort(
    (a, b) =>
      a.start_offset - b.start_offset ||
      a.end_offset - b.end_offset,
  );

  // Resolve any overlapping detections conservatively.
  const nonOverlappingMatches: PrivacyMatch[] = [];

  for (const match of matches) {
    const overlaps = nonOverlappingMatches.some(
      existing =>
        match.start_offset < existing.end_offset &&
        match.end_offset > existing.start_offset,
    );

    if (!overlaps) {
      nonOverlappingMatches.push(match);
    }
  }

  let displayText = text;

  // Replace from right to left so original offsets remain valid.
  for (const match of [...nonOverlappingMatches].reverse()) {
    const replacement =
      match.type === "email"
        ? "[REDACTED_EMAIL]"
        : "[REDACTED_PHONE]";

    displayText =
      displayText.slice(0, match.start_offset) +
      replacement +
      displayText.slice(match.end_offset);
  }

  return {
    display_text: displayText,
    contains_email: nonOverlappingMatches.some(
      match => match.type === "email",
    ),
    contains_phone: nonOverlappingMatches.some(
      match => match.type === "phone",
    ),
    matches: nonOverlappingMatches,
  };
}
