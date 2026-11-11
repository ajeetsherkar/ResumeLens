import type { Warning } from "../../types";

export type ResumeSectionName =
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "summary";

export interface SectionLine {
  text: string;
  start_offset: number;
  end_offset: number;
}

export interface SectionExtraction {
  sections: Record<ResumeSectionName, SectionLine[]>;
  warnings: Warning[];
}

const SECTION_ALIASES: Record<ResumeSectionName, string[]> = {
  experience: [
    "experience",
    "work experience",
    "professional experience",
    "employment history",
    "internship experience",
    "work history",
  ],
  education: [
    "education",
    "academic background",
    "educational qualifications",
    "academic qualifications",
  ],
  skills: [
    "skills",
    "core skills",
    "technical skills",
    "key skills",
    "skills and competencies",
    "technical expertise",
    "tools / technologies",
    "tools and technologies",
  ],
  projects: [
    "projects",
    "projects / deliverables",
    "selected projects",
    "academic projects",
    "personal projects",
  ],
  certifications: [
    "certifications",
    "certifications & licenses",
    "certifications and licenses",
    "certificates",
    "licenses and certifications",
    "professional certifications",
  ],
  summary: [
    "summary",
    "professional summary",
    "profile",
    "professional profile",
    "career objective",
    "objective",
    "about me",
  ],
};

const OTHER_HEADINGS = [
  "languages",
  "interests",
  "hobbies",
  "awards",
  "awards / honors",
  "awards and honors",
  "honors & awards",
  "achievements",
  "achievements and awards",
  "publications",
  "volunteer experience",
  "extracurricular activities",
  "additional information",
  "references",
];

function normalizeHeading(line: string): string {
  return line
    .normalize("NFKC")
    .replace(/[\u00a0\t]/g, " ")
    .replace(/[:|]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("en");
}

const HEADING_LOOKUP = new Map<string, ResumeSectionName>();

for (const [section, aliases] of Object.entries(SECTION_ALIASES)) {
  for (const alias of aliases) {
    HEADING_LOOKUP.set(
      normalizeHeading(alias),
      section as ResumeSectionName,
    );
  }
}

const OTHER_HEADING_LOOKUP = new Set(
  OTHER_HEADINGS.map(normalizeHeading),
);

export function extractSections(rawText: string): SectionExtraction {
  const sections: Record<ResumeSectionName, SectionLine[]> = {
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    summary: [],
  };

  const warnings: Warning[] = [];
  let currentSection: ResumeSectionName | null = null;
  let lineStart = 0;

  while (lineStart < rawText.length) {
    let lineEnd = lineStart;

    while (
      lineEnd < rawText.length &&
      rawText[lineEnd] !== "\r" &&
      rawText[lineEnd] !== "\n"
    ) {
      lineEnd++;
    }

    const originalLine = rawText.slice(lineStart, lineEnd);
    const trimmed = originalLine.trim();

    const headingKey = normalizeHeading(trimmed);
    const heading = HEADING_LOOKUP.get(headingKey);

    if (heading) {
      currentSection = heading;
    } else if (OTHER_HEADING_LOOKUP.has(headingKey)) {
      // Do not assign unrelated section content to the previous section.
      currentSection = null;
    } else if (currentSection && trimmed) {
      const leadingWhitespace =
        originalLine.length - originalLine.trimStart().length;

      const textStart = lineStart + leadingWhitespace;

      sections[currentSection].push({
        text: trimmed,
        start_offset: textStart,
        end_offset: textStart + trimmed.length,
      });
    }

    // Advance by the actual separator length (1 or 2 characters).
    if (lineEnd < rawText.length) {
      lineStart =
        rawText[lineEnd] === "\r" &&
        rawText[lineEnd + 1] === "\n"
          ? lineEnd + 2
          : lineEnd + 1;
    } else {
      lineStart = rawText.length;
    }
  }

  for (const section of Object.keys(sections) as ResumeSectionName[]) {
    if (sections[section].length === 0) {
      warnings.push({
        code: "missing_section",
        message: `No content detected for ${section} section.`,
        section,
      });
    }
  }

  return { sections, warnings };
}
