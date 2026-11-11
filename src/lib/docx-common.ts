import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";

const WORD_NAMESPACE =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

const WORD_XML_PATHS = /^word\/(document|header\d+|footer\d+)\.xml$/i;

/**
 * Normalize whitespace without changing source words.
 * Keep the original extracted text separately.
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
 * Extract paragraphs from document, header and footer XML.
 * Text boxes contained in Word paragraphs are included.
 */
export async function extractFallbackText(
  buffer: ArrayBuffer,
): Promise<string> {
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
 * Compare extracted content while ignoring paragraph-spacing differences.
 * Original extraction text remains unchanged.
 */
export function normalizeForComparison(text: string): string {
  return normalizeWhitespace(text)
    .replace(/\s+/g, " ")
    .trim();
}
