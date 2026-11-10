import JSZip from "jszip";
import mammoth from "mammoth/mammoth.browser";
import { DOMParser } from "@xmldom/xmldom";

import type { Warning } from "@/types";

export interface DocxExtractionResult {
  rawText: string;
  normalizedText: string;
  fallbackRawText: string;
  warnings: Warning[];
}

const WORD_NAMESPACE =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

const WORD_XML_PATHS = /^word\/(document|header\d+|footer\d+)\.xml$/i;

/**
 * Normalize whitespace without changing the underlying words.
 * The original extraction is retained separately in rawText.
 */
export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extract text from WordprocessingML paragraphs.
 * This preserves paragraph boundaries and includes text boxes
 * contained in document, header, and footer XML parts.
 */
async function extractFallbackText(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);

  const xmlPaths = Object.keys(zip.files)
    .filter((path) => WORD_XML_PATHS.test(path))
    .sort();

  const extractedParts: string[] = [];

  for (const path of xmlPaths) {
    const file = zip.file(path);
    if (!file) continue;

    const xmlText = await file.async("text");

    const xml = new DOMParser().parseFromString(
      xmlText,
      "application/xml",
    );

    if (xml.getElementsByTagName("parsererror").length > 0) {
      throw new Error(`Invalid XML found in ${path}`);
    }

    const paragraphs = Array.from(
      xml.getElementsByTagNameNS(WORD_NAMESPACE, "p"),
    );

    const paragraphTexts = paragraphs
      .map((paragraph) => {
        const textNodes = Array.from(
          paragraph.getElementsByTagNameNS(WORD_NAMESPACE, "t"),
        );

        return textNodes.map((node) => node.textContent ?? "").join("");
      })
      .filter((text) => text.length > 0);

    if (paragraphTexts.length > 0) {
      extractedParts.push(paragraphTexts.join("\n"));
    }
  }

  return extractedParts.join("\n");
}

/**
 * Extract text from a DOCX file in the browser.
 * No file contents are uploaded to a server.
 */
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

  if (normalizedText !== normalizedFallbackText) {
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
