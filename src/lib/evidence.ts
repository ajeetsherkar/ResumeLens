import { EVIDENCE_TIER_CREDITS } from "../config";
import type { EvidenceTier } from "../types";
import type { QualityAssessment } from "./quality";
import type {
  ResumeSectionName,
  SectionLine,
} from "./normalization/sections";
import {
  EVIDENCE_DICTIONARY,
  type EvidenceCriterion,
  type EvidenceRole,
} from "./evidence-dictionary";

export interface EvidenceInput {
  raw_text: string;
  sections: Record<ResumeSectionName, SectionLine[]>;
  extraction_status: "success" | "partial" | "failed" | "empty";
  quality?: QualityAssessment;
}

export interface VerifiedEvidence {
  criterion_id: string;
  criterion_label: string;
  role: EvidenceRole;
  tier: EvidenceTier;
  matched_aliases: string[];
  snippets: VerifiedSnippet[];
  credit: number;
  reason: string;
}

export interface VerifiedSnippet {
  text: string;
  matched_text: string;
  section: ResumeSectionName;
  start_offset: number;
  end_offset: number;
  verified: true;
}

const DEMONSTRATED_SECTIONS = new Set<ResumeSectionName>([
  "experience",
  "projects",
]);

const LISTED_SECTIONS = new Set<ResumeSectionName>([
  "skills",
  "certifications",
]);

const AMBIGUOUS_SECTIONS = new Set<ResumeSectionName>([
  "summary",
  "education",
]);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findAliasMatches(
  text: string,
  aliases: string[],
): Array<{ alias: string; start: number; end: number }> {
  const matches: Array<{ alias: string; start: number; end: number }> = [];

  for (const alias of [...aliases].sort(
    (a, b) => b.length - a.length,
  )) {
    const pattern = new RegExp(
      `(^|[^\\p{L}\\p{N}])(${escapeRegExp(alias)})(?=$|[^\\p{L}\\p{N}])`,
      "giu",
    );

    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const start = match.index + match[1].length;
      const end = start + match[2].length;

      const overlaps = matches.some(
        existing => start < existing.end && end > existing.start,
      );

      if (!overlaps) {
        matches.push({ alias, start, end });
      }
    }
  }

  return matches.sort((a, b) => a.start - b.start);
}

function isGloballyDamagedSource(input: EvidenceInput): boolean {
  return (
    input.extraction_status === "failed" ||
    input.extraction_status === "partial" ||
    input.extraction_status === "empty" ||
    input.quality?.rules.some(
      rule => rule.fired && ["R1", "R8"].includes(rule.rule_id),
    ) === true
  );
}

function isTruncatedLine(line: string): boolean {
  return (
    /,\s*[a-z]\./i.test(line) ||
    /^\s*\d{1,4}[.,]?\s*$/.test(line)
  );
}

function verifySnippet(
  rawText: string,
  line: SectionLine,
  start: number,
  end: number,
  matchedText: string,
  section: ResumeSectionName,
): VerifiedSnippet {
  const snippet = rawText.slice(line.start_offset, line.end_offset);
  const absoluteStart = line.start_offset + start;
  const absoluteEnd = line.start_offset + end;

  if (
    !snippet ||
    rawText.slice(line.start_offset, line.end_offset) !== line.text ||
    rawText.slice(absoluteStart, absoluteEnd) !== matchedText ||
    rawText.slice(line.start_offset, line.end_offset) !== snippet ||
    !verifyEvidenceSnippet(rawText, snippet)
  ) {
    throw new Error(
      `Evidence snippet verification failed at offset ${line.start_offset}.`,
    );
  }

  return {
    text: snippet,
    matched_text: matchedText,
    section,
    start_offset: line.start_offset,
    end_offset: line.end_offset,
    verified: true,
  };
}

function determineTier(
  sections: ResumeSectionName[],
  damaged: boolean,
): EvidenceTier {
  if (damaged) return "source_incomplete";

  if (sections.some(section => DEMONSTRATED_SECTIONS.has(section))) {
    return "demonstrated";
  }

  if (sections.some(section => LISTED_SECTIONS.has(section))) {
    return "listed_only";
  }

  if (sections.some(section => AMBIGUOUS_SECTIONS.has(section))) {
    return "ambiguous";
  }

  return "missing";
}

function evaluateCriterion(
  input: EvidenceInput,
  role: EvidenceRole,
  criterion: EvidenceCriterion,
): VerifiedEvidence {
  const matches: VerifiedSnippet[] = [];
  const matchedAliases = new Set<string>();
  const matchedSections = new Set<ResumeSectionName>();
  const cleanMatchedSections = new Set<ResumeSectionName>();
  let hasTruncatedMatches = false;
  let hasBareIsoReference = false;
  let hasSpecificIsoStandard = false;

  const sectionNames: ResumeSectionName[] = [
    "experience",
    "projects",
    "skills",
    "certifications",
    "summary",
    "education",
  ];

  for (const section of sectionNames) {
    for (const line of input.sections[section]) {
      const lineMatches = findAliasMatches(
        line.text,
        criterion.aliases,
      );

      if (criterion.criterion_id === "lca_standards") {
        const isoIndex = line.text.search(/\bISO\b/i);

        if (isoIndex >= 0) {
          const afterIso = line.text.slice(isoIndex + 3);
          const hasRecognizedNumber = /^\s*(14040|14044)\b/.test(afterIso);

          if (!hasRecognizedNumber) {
            lineMatches.push({
              alias: "ISO (unspecified standard)",
              start: isoIndex,
              end: isoIndex + 3,
            });
            hasBareIsoReference = true;
          }
        }
      }

      for (const match of lineMatches) {
        const matchedText = line.text.slice(match.start, match.end);
        const snippet = verifySnippet(
          input.raw_text,
          line,
          match.start,
          match.end,
          matchedText,
          section,
        );

        matches.push(snippet);
        matchedAliases.add(match.alias);
        matchedSections.add(section);

        if (
          criterion.criterion_id === "lca_standards" &&
          (match.alias.includes("14040") || match.alias.includes("14044"))
        ) {
          hasSpecificIsoStandard = true;
        }

        if (isTruncatedLine(line.text)) {
          hasTruncatedMatches = true;
        } else {
          cleanMatchedSections.add(section);
        }
      }
    }
  }

  const globallyDamaged = isGloballyDamagedSource(input);

  const tier = globallyDamaged
    ? "source_incomplete"
    : hasBareIsoReference && !hasSpecificIsoStandard
      ? "ambiguous"
      : cleanMatchedSections.size > 0
        ? determineTier([...cleanMatchedSections], false)
        : hasTruncatedMatches
          ? "source_incomplete"
          : matches.length > 0
            ? determineTier([...matchedSections], false)
            : "missing";

  const reasonByTier: Record<EvidenceTier, string> = {
    demonstrated: "Matching evidence found in experience or project content.",
    listed_only: "Matching term appears in a skills or certification list only.",
    ambiguous: "Evidence is vague, unspecified, or appears only in summary or education content.",
    missing: "No matching evidence was found in the inspected sections.",
    source_incomplete: "Source extraction is damaged or incomplete; evidence cannot be reliably assessed.",
  };

  return {
    criterion_id: criterion.criterion_id,
    criterion_label: criterion.label,
    role,
    tier,
    matched_aliases: [...matchedAliases],
    snippets: matches,
    credit: EVIDENCE_TIER_CREDITS[tier],
    reason: reasonByTier[tier],
  };
}

export function verifyEvidenceSnippet(
  rawText: string,
  snippet: string,
): boolean {
  return snippet.length > 0 && rawText.includes(snippet);
}

export function assessEvidence(
  input: EvidenceInput,
  role: EvidenceRole,
): VerifiedEvidence[] {
  return EVIDENCE_DICTIONARY[role].map(criterion =>
    evaluateCriterion(input, role, criterion),
  );
}
