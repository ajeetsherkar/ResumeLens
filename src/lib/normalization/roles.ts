import type { SectionLine } from "./sections";
import type { ExperiencePeriod, RoleExperienceInput } from "./experience";

export type RoleAttribution = ExperiencePeriod["attribution"];

export interface ExtractedRole extends RoleExperienceInput {
  attribution: RoleAttribution;
  start_offset: number;
  end_offset: number;
  heading_text: string;
  description_lines: SectionLine[];
  warnings: string[];
  confidence: number;
}

const MONTH =
  "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t)?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";

const DATE_RANGE =
  new RegExp(
    `(?:${MONTH}\\.?\\s+['"’‘]?\\d{2,4}\\s*(?:–|—|-|to)\\s*(?:${MONTH}\\.?\\s+['"’‘]?\\d{2,4}|present|current|ongoing|now)|\\d{4}\\s*(?:–|—|-|to)\\s*(?:\\d{4}|present|current|ongoing|now)|${MONTH}\\.?\\s*–\\s*${MONTH}\\.?\\s+['"’‘]?\\d{2,4}|\\d{1,2}/\\d{4}\\s*(?:–|—|-|to)\\s*\\d{1,2}/\\d{4})`,
    "i",
  );

const DURATION =
  /\b\d+(?:\.\d+)?\s*(?:months?|mos?|years?|yrs?)\b/i;

const MISSING_DATE =
  /\b(?:not specified|dates not provided|not provided|null)\b/i;

function clean(value: string): string {
  return value
    .replace(/[\u00a0\t]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findDateText(text: string): string | null {
  const missing = text.match(MISSING_DATE);
  if (missing) return missing[0];

  const duration = text.match(DURATION);
  if (duration) return duration[0];

  const current = text.match(/\b(?:present|current|ongoing|now)\b/i);
  if (current) return current[0];

  const date = text.match(DATE_RANGE);
  return date?.[0] ?? null;
}

function isBullet(text: string): boolean {
  return /^\s*(?:[•●▪◦‣*-]|\d+[.)])\s+/.test(text);
}

function stripBullet(text: string): string {
  return text.replace(/^\s*(?:[•●▪◦‣*-]|\d+[.)])\s+/, "").trim();
}

function classifyAttribution(
  title: string,
  description: string,
): RoleAttribution {
  const titleText = title.toLowerCase();
  const text = `${title} ${description}`.toLowerCase();

  if (/\b(?:intern|internship|trainee)\b/.test(titleText)) {
    return "internship";
  }

  if (
    /\b(?:independent project|academic project|personal project|case study)\b/.test(
      text,
    ) ||
    /^project\b/.test(titleText)
  ) {
    return "project";
  }

  if (
    /\b(?:consultant|designer|engineer|developer|manager|analyst|assistant|specialist|associate|executive|founder|professional)\b/.test(
      titleText,
    )
  ) {
    return "employment";
  }

  return "unknown";
}

function splitHeading(
  heading: string,
  dateText: string,
): { roleTitle: string; employer?: string } {
  const dateIndex = heading.toLowerCase().lastIndexOf(dateText.toLowerCase());
  const beforeDate = clean(
    dateIndex >= 0 ? heading.slice(0, dateIndex) : heading,
  ).replace(/[\s,|–—-]+$/, "");

  const separators = [" — ", " – ", " | ", " @ ", " at "];

  for (const separator of separators) {
    const index = beforeDate.lastIndexOf(separator);

    if (index > 0) {
      const title = clean(beforeDate.slice(0, index));
      const employer = clean(beforeDate.slice(index + separator.length));

      if (title && employer) {
        return { roleTitle: title, employer };
      }
    }
  }

  return { roleTitle: beforeDate || heading };
}

function looksLikeHeading(text: string): boolean {
  const cleaned = clean(text);

  if (!cleaned || isBullet(cleaned)) return false;
  if (cleaned.length > 220) return false;

  const dateText = findDateText(cleaned);

  if (!dateText) return false;

  const beforeDate = clean(
    cleaned.slice(0, cleaned.toLowerCase().lastIndexOf(dateText.toLowerCase())),
  );

  return beforeDate.length >= 2;
}

export function extractRoles(
  lines: SectionLine[],
): ExtractedRole[] {
  const roles: ExtractedRole[] = [];
  let current: ExtractedRole | null = null;

  for (const line of lines) {
    const text = clean(line.text);

    if (looksLikeHeading(text)) {
      if (current) {
        current.end_offset = line.start_offset;
      }

      const dateText = findDateText(text)!;
      const { roleTitle, employer } = splitHeading(text, dateText);

      const warnings: string[] = [];

      if (MISSING_DATE.test(dateText)) {
        warnings.push("missing_date");
      }

      if (DURATION.test(dateText)) {
        warnings.push("duration_only_date");
      }

      if (/^(?:present|current|ongoing|now)$/i.test(dateText)) {
        warnings.push("missing_start_date");
      }

      current = {
        role_title: roleTitle,
        employer,
        original_date_text: dateText,
        description: "",
        attribution: classifyAttribution(roleTitle, ""),
        start_offset: line.start_offset,
        end_offset: line.end_offset,
        heading_text: line.text,
        description_lines: [],
        warnings,
        confidence: employer ? 0.85 : 0.65,
      };

      roles.push(current);
      continue;
    }

    if (!current) continue;

    if (text) {
      current.description_lines.push(line);
      const description = stripBullet(text);

      current.description = [
        current.description,
        description,
      ]
        .filter(Boolean)
        .join(" ");

      current.end_offset = line.end_offset;
      current.attribution = classifyAttribution(
        current.role_title,
        current.description,
      );
    }
  }

  return roles;
}
