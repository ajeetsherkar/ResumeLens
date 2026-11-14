import { NextResponse } from "next/server";
import {
  processUploadedResume,
  processResumeText,
} from "@/lib/upload-processing";


export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = await request.json();

      if (typeof body.text !== "string" || !body.text.trim()) {
        return NextResponse.json(
          { error: "Please provide corrected resume text." },
          { status: 400 },
        );
      }

      const filename =
        typeof body.filename === "string"
          ? body.filename.slice(0, 255)
          : "session-corrected-resume.docx";

      const result = processResumeText(body.text, filename);

      return NextResponse.json(result, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please select a DOCX file." },
        { status: 400 },
      );
    }

    const result = await processUploadedResume(file);

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to process this resume.";

    const status =
      message.startsWith("Unsupported") ||
      message.includes("empty") ||
      message.includes("too large") ||
      message.includes("corrupt") ||
      message.includes("missing its main") ||
      message.includes("No readable text") ||
      message.includes("corrected resume text") ||
      message.includes("too long")
        ? 400
        : 500;

    return NextResponse.json(
      { error: message },
      {
        status,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
