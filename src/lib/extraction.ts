import mammoth from "mammoth/mammoth.browser";
import type { Warning } from "@/types";
import {
  extractFallbackText,
  normalizeWhitespace,
  normalizeForComparison,
} from "./docx-common";

export { normalizeWhitespace } from "./docx-common";

export interface DocxExtractionResult {
  rawText: string;
  normalizedText: string;
  fallbackRawText: string;
  warnings: Warning[];
}

export async function extractDocx(
  file: File,
): Promise<DocxExtractionResult> {
  if (!file.name.toLowerCase().endsWith(".docx")) {
    throw new Error("Unsupported file type. Please select a .docx file.");
  }

  const buffer = await file.arrayBuffer();

  const mammothResult = await mammoth.extractRawText({
    arrayBuffer: buffer,
  });

  const rawText = mammothResult.value;
  const fallbackRawText = await extractFallbackText(buffer);
  const normalizedText = normalizeWhitespace(rawText);
  const normalizedFallbackText = normalizeWhitespace(fallbackRawText);

  const warnings: Warning[] = [];

  if (
    normalizeForComparison(normalizedText) !==
    normalizeForComparison(normalizedFallbackText)
  ) {
    warnings.push({
      code: "extraction_mismatch",
      message:
        "R8: Mammoth extraction differs from the DOCX XML fallback. Review the extracted text before relying on it.",
    });
  }

  if (!normalizedText) {
    warnings.push({
      code: "low_quality_extraction",
      message: "No readable text was extracted from this DOCX file.",
    });
  }

  return {
    rawText,
    normalizedText,
    fallbackRawText,
    warnings,
  };
}
