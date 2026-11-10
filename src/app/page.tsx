"use client";

import { useRef, useState } from "react";
import { extractDocx, type DocxExtractionResult } from "@/lib/extraction";

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<DocxExtractionResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);

  async function handleFile(file?: File) {
    if (!file) return;

    setError("");
    setResult(null);
    setFileName(file.name);
    setIsExtracting(true);

    try {
      const extraction = await extractDocx(file);
      setResult(extraction);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to extract text from this document.",
      );
    } finally {
      setIsExtracting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-10">
          <div className="mb-3 inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
            ResumeLens
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Resume screening, with evidence.
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Upload a DOCX resume to inspect its extracted text. This early
            prototype focuses on transparent document extraction and warnings.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Upload a resume</h2>
            <p className="mt-1 text-sm text-slate-500">
              DOCX files only. Your document is processed in this browser.
            </p>
          </div>

          <div
            className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center transition hover:border-indigo-400"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void handleFile(event.dataTransfer.files[0]);
            }}
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-xl text-indigo-700">
              ↑
            </div>
            <p className="font-medium text-slate-800">
              Drop your DOCX file here
            </p>
            <p className="mt-1 text-sm text-slate-500">
              or choose a file from your device
            </p>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isExtracting}
              className="mt-5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Choose DOCX file
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(event) => {
                void handleFile(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
          </div>

          {isExtracting && (
            <p className="mt-4 text-sm text-indigo-700">
              Extracting document text…
            </p>
          )}

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {result && (
            <div className="mt-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {fileName}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Extraction completed
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setFileName("");
                    setError("");
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Clear
                </button>
              </div>

              {result.warnings.length > 0 && (
                <div
                  role="status"
                  className="rounded-lg border border-amber-200 bg-amber-50 p-4"
                >
                  <h3 className="text-sm font-semibold text-amber-900">
                    Extraction warnings
                  </h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">
                    {result.warnings.map((warning, index) => (
                      <li key={`${warning.code}-${index}`}>
                        {warning.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Extracted text
                  </h3>
                  <span className="text-xs text-slate-500">
                    {result.normalizedText.length.toLocaleString()} characters
                  </span>
                </div>
                <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                  {result.normalizedText || "No text was extracted."}
                </pre>
              </div>
            </div>
          )}
        </section>

        <p className="mt-5 text-center text-xs leading-5 text-slate-500">
          Privacy note: this prototype processes the selected DOCX in your
          browser. Do not upload real candidate documents to public demos unless
          you have permission to use them.
        </p>
      </div>
    </main>
  );
}
