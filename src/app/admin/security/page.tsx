import { redirect } from "next/navigation";
import Link from "next/link";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateTotpSecret, buildOtpAuthUrlAndQr, verifyTotp } from "@/lib/twofa";
import { logAdminAction } from "@/lib/audit";

type SearchParams = Promise<{ error?: string }>;
export const dynamic = "force-dynamic";

export default async function SecurityPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  const sp = await searchParams;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/admin/login");

  let pending: { secret: string; qrDataUrl: string } | null = null;
  if (!user.totpEnabled) {
    const secret = generateTotpSecret();
    const { qrDataUrl } = await buildOtpAuthUrlAndQr({ email: user.email, secret });
    pending = { secret, qrDataUrl };
  }

  async function enroll(formData: FormData) {
    "use server";
    const session2 = await auth();
    if (!session2?.user) redirect("/admin/login");
    const secret = String(formData.get("secret") ?? "");
    const code = String(formData.get("code") ?? "");
    if (!secret || !code) redirect("/admin/security?error=missing");
    if (!verifyTotp({ token: code, secret })) redirect("/admin/security?error=invalid");
    await prisma.user.update({
      where: { id: session2.user.id },
      data: { totpSecret: secret, totpEnabled: true, totpEnrolledAt: new Date() },
    });
    await logAdminAction({
      action: "user.password_changed",
      entityType: "user",
      entityId: session2.user.id,
      summary: "Enabled 2FA on own account",
    });
    redirect("/admin/security");
  }

  async function disable(formData: FormData) {
    "use server";
    const session2 = await auth();
    if (!session2?.user) redirect("/admin/login");
    const password = String(formData.get("password") ?? "");
    const u = await prisma.user.findUnique({ where: { id: session2.user.id } });
    if (!u) redirect("/admin/login");
    if (!(await bcrypt.compare(password, u.password))) redirect("/admin/security?error=wrong_password");
    await prisma.user.update({
      where: { id: u.id },
      data: { totpEnabled: false, totpSecret: null, totpEnrolledAt: null },
    });
    await logAdminAction({
      action: "user.password_changed",
      entityType: "user",
      entityId: u.id,
      summary: "Disabled 2FA on own account",
    });
    redirect("/admin/security");
  }

  const errorMsg = {
    missing: "Enter the 6-digit code from your authenticator.",
    invalid: "Code didn't match. Try the next one your app shows.",
    wrong_password: "Current password is incorrect.",
  }[sp.error ?? ""];

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Security</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Two-factor authentication adds a one-time code on top of your password.
        </p>
      </div>

      <section className="bg-[#141414] border border-white/10 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-sm uppercase tracking-wider text-[#c9a56a] font-semibold">
            Two-Factor Authentication
          </h2>
          <span
            className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
              user.totpEnabled ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-500/15 text-zinc-300"
            }`}
          >
            {user.totpEnabled ? "Enabled" : "Not set up"}
          </span>
        </div>

        {errorMsg && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
            {errorMsg}
          </div>
        )}

        {user.totpEnabled ? (
          <>
            <div className="text-sm text-zinc-300">
              Two-factor is on for <strong>{user.email}</strong>.{" "}
              {user.totpEnrolledAt && (
                <span className="text-zinc-500">
                  Enrolled {user.totpEnrolledAt.toLocaleString("en-GB", { dateStyle: "medium" })}
                </span>
              )}
            </div>
            <form action={disable} className="space-y-3 pt-2 border-t border-white/5">
              <div className="text-xs text-zinc-500">To turn 2FA off, confirm your password.</div>
              <input
                type="password" name="password" required placeholder="Current password"
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-[#c9a56a]"
              />
              <button
                type="submit"
                className="text-sm font-medium px-4 py-2 rounded-md border border-red-500/40 text-red-300 hover:bg-red-500/10"
              >
                Disable 2FA
              </button>
            </form>
          </>
        ) : pending ? (
          <form action={enroll} className="space-y-5">
            <ol className="space-y-3 text-sm text-zinc-300 list-decimal pl-5">
              <li>
                Install <strong>Google Authenticator</strong>, <strong>1Password</strong>, or any TOTP app.
              </li>
              <li>
                In the app: <em>Add account → Scan QR</em>, then scan this code:
              </li>
            </ol>
            <div className="flex justify-center">
              <div className="bg-white p-3 rounded-lg border-2 border-[#c9a56a]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pending.qrDataUrl} alt="TOTP QR code" width={220} height={220} />
              </div>
            </div>
            <details className="text-xs text-zinc-500">
              <summary className="cursor-pointer hover:text-white">
                Can't scan? Show secret to type manually
              </summary>
              <div className="mt-2 font-mono text-zinc-200 bg-black/40 p-2 rounded break-all">
                {pending.secret}
              </div>
            </details>
            <input type="hidden" name="secret" value={pending.secret} />
            <div>
              <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-1.5">
                Enter the 6-digit code your app shows
              </label>
              <input
                type="text" name="code" required
                inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code"
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2.5 text-white font-mono text-center tracking-widest focus:outline-none focus:border-[#c9a56a]"
                placeholder="000 000"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#c9a56a] text-black font-semibold py-2.5 rounded-md hover:bg-[#e0c490] transition"
            >
              Verify & Enable 2FA
            </button>
            <div className="text-xs text-zinc-500">
              After enabling, you'll be asked for a code on every sign-in. If you lose your
              device, another admin can reset your 2FA from your account page.
            </div>
          </form>
        ) : null}
      </section>

      <Link
        href="/admin/password"
        className="block bg-[#141414] border border-white/10 rounded-2xl p-5 hover:border-[#c9a56a]/40 transition"
      >
        <div className="text-sm font-semibold text-white">Change Password</div>
        <div className="text-xs text-zinc-500 mt-1">
          Choose something you don't use anywhere else.
        </div>
      </Link>
    </div>
  );
}
