// Active = expiry date in the future (document optional during transition).
// Missing = neither expiry date nor document uploaded.
// Expired = expiry date in the past.
// Soon = within 30 days of expiry.

import { isExpired, daysUntil } from "./dates";

export type Derived =
  | "active"
  | "expired"
  | "soon"
  | "missing"; // nothing recorded

export function deriveStatus(args: {
  expiry: Date | null | undefined;
  documentUrl?: string | null | undefined;
}): Derived {
  const { expiry, documentUrl } = args;

  if (!expiry && !documentUrl) return "missing";

  if (expiry) {
    if (isExpired(expiry)) return "expired";
    const d = daysUntil(expiry);
    if (d !== null && d < 30) return "soon";
    return "active";
  }

  // Document present but no expiry — treat as active.
  return "active";
}
