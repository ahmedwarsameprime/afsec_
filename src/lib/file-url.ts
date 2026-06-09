// Rewrite a stored file URL through the auth-gated /api/file proxy.
// Pass-through for local /uploads/ or any non-Blob URL.
export function proxiedFileUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/uploads/")) return url;
  if (!url.match(/\.blob\.vercel-storage\.com\//)) return url;
  return `/api/file?u=${encodeURIComponent(url)}`;
}
