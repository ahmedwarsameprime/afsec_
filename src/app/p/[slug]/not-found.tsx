import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-[#0a0a0a]">
      <div className="max-w-md text-center">
        <Logo size={36} />
        <div className="mt-8 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-500/30 bg-red-500/5">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-xs font-medium uppercase tracking-wider text-red-300">
            Profile Not Found
          </span>
        </div>
        <h1 className="mt-6 text-2xl font-bold text-white">
          This credential could not be verified.
        </h1>
        <p className="mt-3 text-sm text-zinc-400">
          The QR code may be invalid, the employee record may have been removed,
          or the link is incorrect. Contact SOC-AFSEC if you believe this is an
          error.
        </p>
        <a
          href="mailto:info@soc-afsec.com"
          className="mt-8 inline-flex items-center justify-center gap-2 px-5 py-2 rounded-md bg-[#c9a56a] text-black font-semibold hover:bg-[#e0c490] transition"
        >
          Contact SOC-AFSEC
        </a>
      </div>
    </main>
  );
}
