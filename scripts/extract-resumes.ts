import fs from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";
import {
  extractFallbackText,
  normalizeWhitespace,
  normalizeForComparison,
} from "../src/lib/docx-common";

const SOURCE_DIR =
  path.join(
    process.env.HOME ?? "",
    "Desktop/growth-for-impact-resume-dataset/resumes",
  );

const OUTPUT_DIR = path.join(process.cwd(), "data/processed");
const EXPECTED_COUNT = 46;

interface ExtractionWarning {
  code: string;
  message: string;
}

interface ExtractedResume {
  candidate_id: string;
  source_file: string;
  extraction_status: "success" | "empty" | "failed";
  raw_text: string;
  normalized_text: string;
  fallback_raw_text: string;
  character_count: number;
  warnings: ExtractionWarning[];
  error?: string;
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const directoryEntries = await fs.readdir(SOURCE_DIR, {
    withFileTypes: true,
  });

  const files = directoryEntries
    .filter(
      (entry) =>
        entry.isFile() &&
        /^resume_\d{3}\.docx$/i.test(entry.name),
    )
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const fileNumbers = new Set(
    files.map((file) => Number(file.match(/resume_(\d{3})/i)?.[1])),
  );

  const missingNumbers = Array.from(
    { length: EXPECTED_COUNT },
    (_, index) => index + 1,
  ).filter((number) => !fileNumbers.has(number));

  const results: ExtractedResume[] = [];

  for (const filename of files) {
    const filePath = path.join(SOURCE_DIR, filename);
    const candidateId = filename.match(/resume_(\d{3})/i)?.[1] ?? filename;

    console.log(`Extracting ${filename}...`);

    try {
      const buffer = await fs.readFile(filePath);
      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      ) as ArrayBuffer;

      const mammothResult = await mammoth.extractRawText({
        path: filePath,
      });

      const rawText = mammothResult.value;
      const fallbackRawText = await extractFallbackText(arrayBuffer);
      const normalizedText = normalizeWhitespace(rawText);

      const warnings: ExtractionWarning[] = [];

      if (
        normalizeForComparison(normalizedText) !==
        normalizeForComparison(fallbackRawText)
      ) {
        warnings.push({
          code: "extraction_mismatch",
          message: "R8: Mammoth extraction differs from DOCX XML fallback.",
        });
      }

      const status = normalizedText.length === 0 ? "empty" : "success";

      if (status === "empty") {
        warnings.push({
          code: "low_quality_extraction",
          message: "No readable text was extracted.",
        });
      }

      results.push({
        candidate_id: candidateId,
        source_file: filename,
        extraction_status: status,
        raw_text: rawText,
        normalized_text: normalizedText,
        fallback_raw_text: fallbackRawText,
        character_count: normalizedText.length,
        warnings,
      });
    } catch (error) {
      results.push({
        candidate_id: candidateId,
        source_file: filename,
        extraction_status: "failed",
        raw_text: "",
        normalized_text: "",
        fallback_raw_text: "",
        character_count: 0,
        warnings: [],
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const succeeded = results.filter(
    (result) => result.extraction_status === "success",
  );
  const failed = results.filter(
    (result) => result.extraction_status === "failed",
  );
  const empty = results.filter(
    (result) => result.extraction_status === "empty",
  );

  const report = {
    generated_at: new Date().toISOString(),
    source_directory: SOURCE_DIR,
    expected_file_count: EXPECTED_COUNT,
    files_found: files.length,
    succeeded: succeeded.length,
    failed: failed.length,
    empty: empty.length,
    missing_numbers: missingNumbers,
    unexpected_numbers: [...fileNumbers]
      .filter((number) => number < 1 || number > EXPECTED_COUNT)
      .sort((a, b) => a - b),
    total_characters: results.reduce(
      (total, result) => total + result.character_count,
      0,
    ),
    files: results.map((result) => ({
      filename: result.source_file,
      status: result.extraction_status,
      characters: result.character_count,
      warning_count: result.warnings.length,
      error: result.error ?? null,
    })),
  };

  await fs.writeFile(
    path.join(OUTPUT_DIR, "extracted.json"),
    JSON.stringify(results, null, 2),
    "utf8",
  );

  await fs.writeFile(
    path.join(OUTPUT_DIR, "extraction-report.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );

  const markdown = [
    "# ResumeLens — Batch Extraction Report",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Dataset audit",
    "",
    `- Expected files: ${EXPECTED_COUNT}`,
    `- Files found: ${report.files_found}`,
    `- Missing numbers: ${missingNumbers.length ? missingNumbers.join(", ") : "None"}`,
    `- Succeeded: ${report.succeeded}`,
    `- Failed: ${report.failed}`,
    `- Empty: ${report.empty}`,
    `- Total normalized characters: ${report.total_characters}`,
    "",
    "## Per-file extraction",
    "",
    "| File | Status | Characters | Warnings | Error |",
    "|---|---:|---:|---:|---|",
    ...report.files.map(
      (file) =>
        `| ${file.filename} | ${file.status} | ${file.characters} | ${file.warning_count} | ${file.error ?? ""} |`,
    ),
    "",
  ].join("\n");

  await fs.writeFile(
    path.join(OUTPUT_DIR, "extraction-report.md"),
    markdown,
    "utf8",
  );

  console.log("\n========== EXTRACTION SUMMARY ==========");
  console.log(`Expected files : ${EXPECTED_COUNT}`);
  console.log(`Files found    : ${report.files_found}`);
  console.log(`Succeeded      : ${report.succeeded}`);
  console.log(`Failed         : ${report.failed}`);
  console.log(`Empty          : ${report.empty}`);
  console.log(
    `Missing numbers: ${missingNumbers.length ? missingNumbers.join(", ") : "None"}`,
  );
  console.log(`Total chars    : ${report.total_characters}`);
  console.log(`Output         : ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error("Batch extraction failed:", error);
  process.exitCode = 1;
});
