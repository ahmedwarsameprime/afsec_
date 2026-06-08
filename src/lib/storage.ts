// File storage abstraction.
// - On Vercel (BLOB_READ_WRITE_TOKEN present) → Vercel Blob.
// - Locally → /public/uploads/ on disk.
//
// Production deploys must have BLOB_READ_WRITE_TOKEN set (auto-injected
// when the project has a Vercel Blob store attached).

import path from "path";
import { mkdir, writeFile, unlink } from "fs/promises";

const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const onVercel = Boolean(process.env.VERCEL);

export async function saveUpload(
  file: File,
  prefix: string,
  allowedExts: string[]
): Promise<string | undefined> {
  if (!file || file.size === 0) return undefined;
  if (file.size > 10_000_000) {
    console.warn(
      `[storage] rejected upload "${file.name}" (${file.size} bytes) — over 10 MB cap`
    );
    return undefined;
  }
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!allowedExts.includes(ext)) {
    console.warn(
      `[storage] rejected upload "${file.name}" — extension ".${ext}" not in [${allowedExts.join(", ")}]`
    );
    return undefined;
  }

  const safeName = `${prefix}-${Date.now()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  if (useBlob) {
    try {
      const { put } = await import("@vercel/blob");
      const blob = await put(`uploads/${safeName}`, buf, {
        access: "public",
        contentType: file.type || undefined,
        addRandomSuffix: false,
      });
      console.log(`[storage] uploaded to Blob: ${blob.url}`);
      return blob.url;
    } catch (err) {
      console.error("[storage] Vercel Blob put() failed:", err);
      throw new Error(
        `Upload failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // No Blob token: refuse to silently fail on Vercel.
  if (onVercel) {
    throw new Error(
      "File storage is not configured. Attach a Vercel Blob store to this project so BLOB_READ_WRITE_TOKEN is injected."
    );
  }

  try {
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, safeName), buf);
    return `/uploads/${safeName}`;
  } catch (err) {
    console.error("[storage] local fs write failed:", err);
    throw err;
  }
}

export async function deleteUpload(url: string | null | undefined): Promise<void> {
  if (!url) return;
  try {
    if (url.startsWith("http") && useBlob) {
      const { del } = await import("@vercel/blob");
      await del(url);
      return;
    }
    if (url.startsWith("/uploads/")) {
      await unlink(path.join(process.cwd(), "public", url));
    }
  } catch (err) {
    console.warn("[storage] deleteUpload ignored error:", err);
  }
}
