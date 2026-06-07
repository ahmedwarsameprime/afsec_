import { randomBytes } from "crypto";

// Generate an opaque, URL-safe slug for guard profiles (used in QR codes).
// Length 14 → 112 bits of entropy: not enumerable.
export function generateSlug(): string {
  return randomBytes(10)
    .toString("base64")
    .replace(/\+/g, "0")
    .replace(/\//g, "1")
    .replace(/=/g, "")
    .slice(0, 14);
}
