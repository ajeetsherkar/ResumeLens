import "server-only";

import mammoth from "mammoth";
import JSZip from "jszip";

import type { Warning } from "@/types";
import {
  extractFallbackText,
  normalizeWhitespace,
  normalizeForComparison,
} from "./docx-common";
import { extractSections } from "./normalization/sections";
import { normalizeSkills } from "./normalization/skills";
import { extractEducation } from "./normalization/education";
import { extractRoles } from "./normalization/roles";
import { calculateCandidateExperience } from "./normalization/experience";
import { scanPrivacy } from "./normalization/privacy";
import { assessSourceQuality } from "./quality";
import { assessEvidence, type EvidenceInput } from "./evidence";
import { scoreRole } from "./scoring";
import { classifyRole } from "./classification";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_TEXT_LENGTH = 100_000;
const REFERENCE_DATE = "Nov 2026";
const ROLES = ["LCA", "UI/UX"] as const;

export interface UploadProcessingResult {
  filename: string;
  profile: {
    display_text: string;
    sections: ReturnType<typeof extractSections>["sections"];
    skills: ReturnType<typeof normalizeSkills>;
    education: ReturnType<typeof extractEducation>;
    experience: ReturnType<typeof calculateCandidateExperience>;
    quality: ReturnType<typeof assessSourceQuality>;
    warnings: Warning[];
    privacy: {
      contains_email: boolean;
      contains_phone: boolean;
    };
  };
  role_results: Record<
    (typeof ROLES)[number],
    {
      score: ReturnType<typeof scoreRole>;
      classification: ReturnType<typeof classifyRole>;
      evidence: ReturnType<typeof assessEvidence>;
    }
  >;
}

export function processResumeText(
  text: string,
  filename: string,
  privacyFlags?: { contains_email: boolean; contains_phone: boolean },
  extractionWarnings: Warning[] = [],
): UploadProcessingResult {
  const normalizedText = normalizeWhitespace(text);

  if (!normalizedText) {
    throw new Error("No readable text was provided for review.");
  }

  if (normalizedText.length > MAX_TEXT_LENGTH) {
    throw new Error("Resume text is too long. Maximum supported length is 100,000 characters.");
  }

  const detectedPrivacy = scanPrivacy(normalizedText);
  const privacy = {
    ...detectedPrivacy,
    contains_email:
      privacyFlags?.contains_email ?? detectedPrivacy.contains_email,
    contains_phone:
      privacyFlags?.contains_phone ?? detectedPrivacy.contains_phone,
  };

  const sectionResult = extractSections(normalizedText);
  const skills = normalizeSkills(sectionResult);
  const education = extractEducation(sectionResult.sections.education);
  const extractedRoles = extractRoles(sectionResult.sections.experience);

  const experience = calculateCandidateExperience(
    extractedRoles.map((role) => ({
      role_title: role.role_title,
      employer: role.employer,
      original_date_text: role.original_date_text,
      description: role.description,
      attribution: role.attribution,
    })),
    REFERENCE_DATE,
  );

  const warnings: Warning[] = [
    ...extractionWarnings,
    ...sectionResult.warnings,
  ];

  const quality = assessSourceQuality({
    raw_text: normalizedText,
    extraction_status: "success",
    sections: sectionResult.sections,
    roles: extractedRoles,
    experience,
    privacy,
    extraction_warnings: warnings,
  });

  const evidenceInput: EvidenceInput = {
    raw_text: normalizedText,
    sections: sectionResult.sections,
    extraction_status: "success",
    quality,
  };

  const roleResults = {} as UploadProcessingResult["role_results"];

  for (const role of ROLES) {
    const evidence = assessEvidence(evidenceInput, role);
    const score = scoreRole(evidenceInput, role);
    const classification = classifyRole({
      score: score.total_score,
      sourceConfidence: quality.confidence,
      reviewRequired: quality.review_required,
    });

    roleResults[role] = { score, classification, evidence };
  }

  return {
    filename,
    profile: {
      display_text: normalizedText,
      sections: sectionResult.sections,
      skills,
      education,
      experience,
      quality,
      warnings,
      privacy: {
        contains_email: privacy.contains_email,
        contains_phone: privacy.contains_phone,
      },
    },
    role_results: roleResults,
  };
}

export async function processUploadedResume(
  file: File,
): Promise<UploadProcessingResult> {
  if (!file.name.toLowerCase().endsWith(".docx")) {
    throw new Error("Unsupported file type. Please select a .docx file.");
  }

  if (file.size === 0) {
    throw new Error("The selected file is empty.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File is too large. Maximum supported size is 5 MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let zip: JSZip;

  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new Error("The DOCX file is corrupt or is not a valid Word document.");
  }

  if (!zip.file("word/document.xml")) {
    throw new Error("The DOCX file is missing its main document content.");
  }

  let rawText: string;
  let fallbackRawText: string;

  try {
    const [mammothResult, fallback] = await Promise.all([
      mammoth.extractRawText({ buffer }),
      extractFallbackText(
        buffer.buffer.slice(
          buffer.byteOffset,
          buffer.byteOffset + buffer.byteLength,
        ) as ArrayBuffer,
      ),
    ]);

    rawText = mammothResult.value;
    fallbackRawText = fallback;
  } catch {
    throw new Error(
      "Unable to read this DOCX file. Please check the document and try again.",
    );
  }

  const normalizedText = normalizeWhitespace(rawText);

  if (!normalizedText) {
    throw new Error("No readable text was extracted from this DOCX file.");
  }

  const privacy = scanPrivacy(rawText);
  const safeText = privacy.display_text;
  const warnings: Warning[] = [];

  if (
    normalizeForComparison(normalizedText) !==
    normalizeForComparison(normalizeWhitespace(fallbackRawText))
  ) {
    warnings.push({
      code: "extraction_mismatch",
      message:
        "Mammoth extraction differs from the DOCX XML fallback. Review the extracted text.",
    });
  }

  return processResumeText(
    safeText,
    file.name,
    {
      contains_email: privacy.contains_email,
      contains_phone: privacy.contains_phone,
    },
    warnings,
  );
}
