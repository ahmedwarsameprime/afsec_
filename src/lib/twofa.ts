// otplib v13 functional API.
import { generate, generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";

const ISSUER = "SOC-AFSEC";

// 30-second step + ±1 window = 90s total tolerance.
const COMMON_OPTS = { step: 30, window: 1 } as const;

export function generateTotpSecret(): string {
  return generateSecret({ length: 32 });
}

export async function buildOtpAuthUrlAndQr(args: {
  email: string;
  secret: string;
}): Promise<{ otpauthUrl: string; qrDataUrl: string }> {
  const otpauthUrl = generateURI({
    label: args.email,
    issuer: ISSUER,
    secret: args.secret,
  });
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
    margin: 1,
    width: 320,
    color: { dark: "#0a0a0a", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
  return { otpauthUrl, qrDataUrl };
}

export function verifyTotp(args: { token: string; secret: string }): boolean {
  const t = (args.token ?? "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(t)) return false;
  try {
    const result = verify({ token: t, secret: args.secret, ...COMMON_OPTS });
    return Boolean(result);
  } catch {
    return false;
  }
}

// Currently unused but kept so generate() is exported for downstream callers.
export async function _generateNow(secret: string): Promise<string> {
  return generate({ secret, ...COMMON_OPTS });
}
