import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import { extractDocx } from "./extraction";

const WORD_NAMESPACE =
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

async function createSyntheticDocx(
  paragraphs: string[],
  headerText = "",
): Promise<File> {
  const zip = new JSZip();

  const paragraphXml = paragraphs
    .map(
      (text) =>
        `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`,
    )
    .join("");

  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
    <w:document xmlns:w="${WORD_NAMESPACE}">
      <w:body>${paragraphXml}</w:body>
    </w:document>`,
  );

  if (headerText) {
    zip.file(
      "word/header1.xml",
      `<?xml version="1.0" encoding="UTF-8"?>
      <w:hdr xmlns:w="${WORD_NAMESPACE}">
        <w:p><w:r><w:t>${headerText}</w:t></w:r></w:p>
      </w:hdr>`,
    );
  }

  const buffer = await zip.generateAsync({ type: "arraybuffer" });

  return new File([buffer], "synthetic-resume.docx", {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

describe("DOCX extraction integration", () => {
  it("extracts document paragraphs from a synthetic DOCX", async () => {
    const file = await createSyntheticDocx([
      "Python Developer",
      "Machine Learning Engineer",
    ]);

    const result = await extractDocx(file);

    expect(result.normalizedText).toContain("Python Developer");
    expect(result.normalizedText).toContain("Machine Learning Engineer");
    expect(result.fallbackRawText).toContain("Python Developer");
    expect(result.fallbackRawText).toContain("Machine Learning Engineer");
  });

  it("includes header text in the XML fallback", async () => {
    const file = await createSyntheticDocx(
      ["Python Developer"],
      "Synthetic Header",
    );

    const result = await extractDocx(file);

    expect(result.fallbackRawText).toContain("Synthetic Header");

    expect(
      result.warnings.some((warning) => warning.code === "extraction_mismatch"),
    ).toBe(true);
  });
});
