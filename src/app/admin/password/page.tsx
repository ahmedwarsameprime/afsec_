import { redirect } from "next/navigation";
import Link from "next/link";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/Logo";
import { logAdminAction } from "@/lib/audit";

type SearchParams = Promise<{ error?: string }>;
export const dynamic = "force-dynamic";

export default async function PasswordChangePage({
  searchParams,
}: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login?callbackUrl=/admin/password");
  const sp = await searchParams;
  const forced = session.user.mustChangePassword;

  async function change(formData: FormData) {
    "use server";
    const session2 = await auth();
    if (!session2?.user) redirect("/admin/login");

    const current = String(formData.get("currentPassword") ?? "");
    const next = String(formData.get("newPassword") ?? "");
    const confirm = String(formData.get("confirmPassword") ?? "");

    if (next.length < 12) redirect("/admin/password?error=too_short");
    if (next !== confirm) redirect("/admin/password?error=mismatch");
    if (next === current) redirect("/admin/password?error=same");

    const user = await prisma.user.findUnique({ where: { id: session2.user.id } });
    if (!user) redirect("/admin/login");

    const ok = await bcrypt.compare(current, user.password);
    if (!ok) redirect("/admin/password?error=wrong");

    const hash = await bcrypt.hash(next, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hash, mustChangePassword: false },
    });
    await logAdminAction({
      action: "user.password_changed",
      entityType: "user",
      entityId: user.id,
      summary: "User changed their own password",
    });
    redirect("/api/auth/signout?callbackUrl=/admin/login");
  }

  const errorMsg = {
    too_short: "Password must be at least 12 characters.",
    mismatch: "New password and confirmation do not match.",
    same: "New password must be different from the current one.",
    wrong: "Current password is incorrect.",
  }[sp.error ?? ""];

  return (
    <main className="min-h-screen w-full flex items-center justify-center px-4 bg-gradient-to-br from-[#0a0a0a] via-[#141414] to-[#0a0a0a]">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo size={40} />
        </div>
        <div className="bg-[#141414] border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white">
              {forced ? "Set a New Password" : "Change Password"}
            </h1>
            {forced ? (
              <p className="text-sm text-amber-300 mt-1">
                Your account is using its initial password. Pick a new one before continuing.
              </p>
            ) : (
              <p className="text-sm text-zinc-400 mt-1">
                Choose something you don't use anywhere else.
              </p>
            )}
          </div>
          <form action={change} className="space-y-4">
            <Field label="Current Password">
              <input
                type="password" name="currentPassword" required autoComplete="current-password"
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2.5 text-white focus:outline-none focus:border-[#c9a56a]"
              />
            </Field>
            <Field label="New Password">
              <input
                type="password" name="newPassword" required minLength={12} autoComplete="new-password"
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2.5 text-white focus:outline-none focus:border-[#c9a56a]"
              />
              <div className="text-xs text-zinc-500 mt-1">Minimum 12 characters.</div>
            </Field>
            <Field label="Confirm New Password">
              <input
                type="password" name="confirmPassword" required minLength={12} autoComplete="new-password"
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2.5 text-white focus:outline-none focus:border-[#c9a56a]"
              />
            </Field>
            {errorMsg && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                {errorMsg}
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-[#c9a56a] text-black font-semibold py-2.5 rounded-md hover:bg-[#e0c490] transition"
            >
              Update Password
            </button>
            {!forced && (
              <Link href="/admin" className="block text-center text-sm text-zinc-400 hover:text-white">
                Cancel
              </Link>
            )}
          </form>
        </div>
        <div className="text-center mt-6 text-xs text-zinc-600">
          You'll be signed out and asked to sign in with the new password.
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1.5">{label}</div>
      {children}
    </label>
  );
}
