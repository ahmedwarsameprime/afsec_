import { notFound } from "next/navigation";
import QRCode from "qrcode";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/Logo";
import { formatDate } from "@/lib/dates";
import { PrintButton } from "./PrintButton";

type Params = Promise<{ id: string }>;
export const dynamic = "force-dynamic";

// Inline the photo as a data URL so it survives print/save-as-PDF.
async function fetchPhotoDataUrl(rawUrl: string | null): Promise<string | null> {
  if (!rawUrl) return null;
  if (rawUrl.startsWith("/uploads/")) return rawUrl;
  try {
    const res = await fetch(rawUrl, {
      headers: process.env.BLOB_READ_WRITE_TOKEN
        ? { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` }
        : {},
      cache: "no-store",
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "image/jpeg";
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${ct};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function IdCardPage({ params }: { params: Params }) {
  const { id } = await params;
  const guard = await prisma.guard.findUnique({ where: { id } });
  if (!guard) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const profileUrl = `${baseUrl}/p/${guard.slug}`;

  const [qrDataUrl, photoDataUrl] = await Promise.all([
    QRCode.toDataURL(profileUrl, {
      margin: 1,
      width: 480,
      color: { dark: "#0a0a0a", light: "#ffffff" },
      errorCorrectionLevel: "H",
    }),
    fetchPhotoDataUrl(guard.photoUrl),
  ]);

  return (
    <div className="space-y-6">
      <div className="no-print">
        <Link
          href={`/admin/${guard.id}`}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          ← Back to profile
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold mt-1">
          ID Card / QR Code
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          When scanned with any phone camera, this QR opens the public
          verification profile.
        </p>
      </div>

      {/* Action bar */}
      <div className="no-print grid grid-cols-1 sm:flex sm:flex-wrap gap-2">
        <PrintButton />
        <a
          href={qrDataUrl}
          download={`SOC-AFSEC-QR-${guard.firstName}-${guard.lastName}.png`}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-white/20 text-white hover:bg-white/5 text-sm font-medium"
        >
          Download QR (PNG)
        </a>
        <Link
          href={`/p/${guard.slug}`}
          target="_blank"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-[#c9a56a]/40 text-[#c9a56a] hover:bg-[#c9a56a]/10 text-sm font-medium"
        >
          Open public profile ↗
        </Link>
      </div>

      <div className="text-xs text-zinc-500 no-print font-mono break-all">
        QR target: {profileUrl}
      </div>

      {/* ID card */}
      <div className="flex justify-center px-2">
        <div
          className="print-card relative w-full max-w-[340px] aspect-[340/540] rounded-2xl overflow-hidden shadow-2xl bg-white text-black border border-zinc-300"
          id="id-card"
        >
          {/* Top band */}
          <div className="h-24 bg-gradient-to-r from-[#0a0a0a] via-[#1c1c1c] to-[#0a0a0a] relative">
            <div className="absolute inset-0 flex items-center justify-between px-4">
              <Logo size={28} variant="light" />
              <div className="text-[9px] uppercase tracking-widest text-[#c9a56a] font-bold">
                Security Officer ID
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#c9a56a]" />
          </div>

          {/* Photo */}
          <div className="flex justify-center -mt-12">
            <div className="w-28 h-28 rounded-2xl border-4 border-white bg-zinc-100 overflow-hidden shadow-xl flex items-center justify-center text-zinc-400">
              {photoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoDataUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
                </svg>
              )}
            </div>
          </div>

          {/* Identity */}
          <div className="text-center px-4 mt-3">
            <div className="font-black text-lg leading-tight uppercase">
              {guard.firstName} {guard.lastName}
            </div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-600 font-medium">
              {guard.jobTitle}
            </div>
            {guard.employeeId && (
              <div className="text-[10px] mt-1 font-mono text-zinc-500">
                ID #{guard.employeeId}
              </div>
            )}
          </div>

          {/* Permit dots */}
          <div className="px-6 mt-3">
            <div className="grid grid-cols-2 gap-2 text-[9px]">
              <PermitChip
                label="P1 Hand Guns"
                active={guard.permit1Active}
                expiry={guard.permit1ExpiryDate}
              />
              <PermitChip
                label="P2 Rifles"
                active={guard.permit2Active}
                expiry={guard.permit2ExpiryDate}
              />
            </div>
          </div>

          {/* QR code */}
          <div className="flex justify-center mt-3">
            <div className="bg-white p-2 border-2 border-[#c9a56a] rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="Scan to verify"
                width={140}
                height={140}
              />
            </div>
          </div>
          <div className="text-center text-[9px] uppercase tracking-widest text-zinc-500 mt-1">
            Scan to Verify
          </div>

          {/* Footer band */}
          <div className="absolute bottom-0 left-0 right-0 bg-[#0a0a0a] text-white px-3 py-2 text-[8px] leading-tight">
            <div className="font-bold text-[#c9a56a] uppercase tracking-wider mb-0.5">
              SOC-AFSEC Industries
            </div>
            <div className="text-zinc-300">
              Marina Hub, Airport Zone · Mogadishu · Somalia
            </div>
            <div className="text-zinc-400">+252 61 5 594 141 · soc-afsec.com</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PermitChip({
  label,
  active,
  expiry,
}: {
  label: string;
  active: boolean;
  expiry: Date | null;
}) {
  const isValid = active && expiry && expiry.getTime() > Date.now();
  return (
    <div
      className={`px-2 py-1 rounded border text-[8px] uppercase tracking-wider font-semibold flex items-center justify-between ${
        isValid
          ? "bg-emerald-50 border-emerald-300 text-emerald-700"
          : "bg-zinc-50 border-zinc-300 text-zinc-500"
      }`}
    >
      <span>{label}</span>
      <span>
        {isValid ? `✓ ${formatDate(expiry)}` : active ? "Expired" : "N/A"}
      </span>
    </div>
  );
}
