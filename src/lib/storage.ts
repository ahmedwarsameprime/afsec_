// File storage with content-aware validation + EXIF stripping.
import path from "path";
import { mkdir, writeFile, unlink } from "fs/promises";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";

const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const onVercel = Boolean(process.env.VERCEL);

const ALLOWED: Record<string, string[]> = {
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  webp: ["image/webp"],
  pdf: ["application/pdf"],
};

const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];

export async function saveUpload(
  file: File,
  prefix: string,
  allowedExts: string[]
): Promise<string | undefined> {
  if (!file || file.size === 0) return undefined;
  if (file.size > 10_000_000) {
    console.warn(`[storage] rejected ${file.name} (${file.size} bytes) — over 10 MB cap`);
    return undefined;
  }

  let buf = Buffer.from(await file.arrayBuffer());

  // Detect real type from magic bytes — never trust file.name.
  const detected = await fileTypeFromBuffer(buf);
  if (!detected) {
    console.warn(`[storage] rejected ${file.name} — could not detect file type`);
    return undefined;
  }

  const allowedMimes = new Set(
    allowedExts.flatMap((e) => ALLOWED[e.toLowerCase()] ?? [])
  );
  if (!allowedMimes.has(detected.mime)) {
    console.warn(`[storage] rejected ${file.name} — detected ${detected.mime} not allowed`);
    return undefined;
  }

  let finalExt = detected.ext;
  let contentType = detected.mime;

  // Re-encode images through sharp to drop EXIF (incl. GPS).
  if (IMAGE_MIMES.includes(detected.mime)) {
    try {
      const img = sharp(buf, { failOn: "truncated" }).rotate();
      if (detected.mime === "image/png") {
        buf = Buffer.from(await img.png().toBuffer());
        finalExt = "png";
      } else if (detected.mime === "image/webp") {
        buf = Buffer.from(await img.webp({ quality: 88 }).toBuffer());
        finalExt = "webp";
      } else {
        buf = Buffer.from(await img.jpeg({ quality: 88, mozjpeg: true }).toBuffer());
        finalExt = "jpg";
        contentType = "image/jpeg";
      }
    } catch (err) {
      console.error("[storage] image re-encode failed:", err);
      return undefined;
    }
  }

  const safeName = `${prefix}-${Date.now()}.${finalExt}`;

  if (useBlob) {
    try {
      const { put } = await import("@vercel/blob");
      const blob = await put(`uploads/${safeName}`, buf, {
        access: "public",
        contentType,
        addRandomSuffix: false,
      });
      return blob.url;
    } catch (err) {
      console.error("[storage] Blob put failed:", err);
      throw new Error(
        `Upload failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  if (onVercel) {
    throw new Error(
      "File storage is not configured. Attach a Vercel Blob store so BLOB_READ_WRITE_TOKEN is injected."
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
