import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth, signIn } from "@/auth";
import { CredentialsSignin } from "next-auth";
import { Logo } from "@/components/Logo";
import {
  checkLoginRateLimit,
  lockoutCheckByEmail,
  recordLoginAttempt,
} from "@/lib/rate-limit";

type SearchParams = Promise<{
  callbackUrl?: string;
  error?: string;
  retryAfter?: string;
  email?: string;
}>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  const sp = await searchParams;
  if (session?.user) {
    if (session.user.mustChangePassword) redirect("/admin/password");
    redirect(sp.callbackUrl ?? "/admin");
  }

  async function login(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").toLowerCase().trim();
    const password = String(formData.get("password") ?? "");
    const code = String(formData.get("code") ?? "").trim();

    const h = await headers();
    const ip =
      (h.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
      h.get("x-real-ip") ||
      "";

    const gate = await checkLoginRateLimit(ip);
    if (!gate.allowed) {
      redirect(`/admin/login?error=RateLimited&retryAfter=${gate.retryAfterSeconds}`);
    }

    try {
      await signIn("credentials", { email, password, code, redirectTo: "/admin" });
      await recordLoginAttempt({ ipAddress: ip, email, succeeded: true });
    } catch (error) {
      if (error instanceof CredentialsSignin) {
        const reason = (error as CredentialsSignin & { code?: string }).code ?? "";
        if (reason === "totp_required") {
          redirect(`/admin/login?error=TotpRequired&email=${encodeURIComponent(email)}`);
        }
        if (reason === "totp_invalid") {
          await recordLoginAttempt({ ipAddress: ip, email, succeeded: false });
          await lockoutCheckByEmail(email);
          redirect(`/admin/login?error=TotpInvalid&email=${encodeURIComponent(email)}`);
        }
        if (reason === "account_locked") {
          redirect(`/admin/login?error=AccountLocked&email=${encodeURIComponent(email)}`);
        }
        await recordLoginAttempt({ ipAddress: ip, email, succeeded: false });
        await lockoutCheckByEmail(email);
        redirect("/admin/login?error=CredentialsSignin");
      }
      throw error;
    }
  }

  const needsCode = sp.error === "TotpRequired" || sp.error === "TotpInvalid";
  const errorMsg = (() => {
    switch (sp.error) {
      case "RateLimited":
        return `Too many failed attempts from your network. Try again in ${Number(sp.retryAfter ?? "60") || 60} seconds.`;
      case "AccountLocked":
        return "This account is locked. Contact an admin to unlock it.";
      case "TotpRequired":
        return "Enter the 6-digit code from your authenticator app.";
      case "TotpInvalid":
        return "Invalid 2FA code. Try the next one your app shows.";
      case "CredentialsSignin":
        return "Invalid email or password.";
      default:
        return null;
    }
  })();

  return (
    <main className="min-h-screen w-full flex items-center justify-center px-4 bg-gradient-to-br from-[#0a0a0a] via-[#141414] to-[#0a0a0a]">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo size={40} />
        </div>
        <div className="bg-[#141414] border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white">CRM Sign In</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Restricted to authorized personnel.
            </p>
          </div>
          <form action={login} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-1.5">Email</label>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                defaultValue={sp.email ?? ""}
                readOnly={needsCode}
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-[#c9a56a] focus:ring-1 focus:ring-[#c9a56a]/40 read-only:opacity-70"
                placeholder="admin@soc-afsec.com"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-1.5">Password</label>
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-[#c9a56a] focus:ring-1 focus:ring-[#c9a56a]/40"
                placeholder="••••••••"
              />
            </div>
            {needsCode && (
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-1.5">2FA Code</label>
                <input
                  type="text"
                  name="code"
                  required
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  autoComplete="one-time-code"
                  autoFocus
                  className="w-full bg-[#0a0a0a] border border-[#c9a56a]/60 rounded-md px-3 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-[#c9a56a] focus:ring-1 focus:ring-[#c9a56a]/40 font-mono text-center tracking-widest"
                  placeholder="000 000"
                />
                <div className="text-xs text-zinc-500 mt-1">
                  From Google Authenticator, 1Password or similar.
                </div>
              </div>
            )}
            {errorMsg && (
              <div
                className={`text-sm rounded-md px-3 py-2 ${
                  needsCode && sp.error === "TotpRequired"
                    ? "text-[#c9a56a] bg-[#c9a56a]/10 border border-[#c9a56a]/30"
                    : "text-red-400 bg-red-500/10 border border-red-500/20"
                }`}
              >
                {errorMsg}
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-[#c9a56a] text-black font-semibold py-2.5 rounded-md hover:bg-[#e0c490] transition"
            >
              {needsCode ? "Verify & Sign In" : "Sign In"}
            </button>
          </form>
        </div>
        <div className="text-center mt-6 text-xs text-zinc-600">
          © {new Date().getFullYear()} SOC-AFSEC Industries
        </div>
      </div>
    </main>
  );
}
