// File storage abstraction.
// - On Vercel (BLOB_READ_WRITE_TOKEN present) → Vercel Blob.
// - Locally → /public/uploads/ on disk.
//
// Production deploys must have BLOB_READ_WRITE_TOKEN set (auto-injected
// when the project has a Vercel Blob store attached).

import path from "path";
import { mkdir, writeFile, unlink } from "fs/promises";

const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export async function saveUpload(
  file: File,
  prefix: string,
  allowedExts: string[]
): Promise<string | undefined> {
  if (!file || file.size === 0 || file.size > 10_000_000) return undefined;
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!allowedExts.includes(ext)) return undefined;

  const safeName = `${prefix}-${Date.now()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  if (useBlob) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`uploads/${safeName}`, buf, {
      access: "public",
      contentType: file.type || undefined,
    });
    return blob.url;
  }

  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, safeName), buf);
  return `/uploads/${safeName}`;
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
  } catch {
    /* ignore — file may already be gone */
  }
}
