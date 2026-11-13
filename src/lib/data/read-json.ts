import "server-only";

import fs from "node:fs";
import path from "node:path";
import { get } from "@vercel/blob";

const dataDirectory = path.join(process.cwd(), "data", "processed");

const allowedFiles = new Set([
  "candidates.json",
  "structured-profiles.json",
]);

export async function readJson<T>(filename: string): Promise<T> {
  if (!allowedFiles.has(filename)) {
    throw new Error(`Unsupported dataset: ${filename}`);
  }

  // Local development and tests use local datasets.
  if (process.env.NODE_ENV !== "production") {
    const filePath = path.join(dataDirectory, filename);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Required local dataset is missing: ${filename}`);
    }

    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  }

  // Production retrieves datasets from private Vercel Blob.
  const pathname = `processed/${filename}`;
  const result = await get(pathname, { access: "private" });

  if (!result || result.statusCode !== 200 || !result.stream) {
    throw new Error(`Required private dataset is missing: ${pathname}`);
  }

  return (await new Response(result.stream).json()) as T;
}
