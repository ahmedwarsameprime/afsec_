import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { AuthError } from "next-auth";
import { Logo } from "@/components/Logo";

type SearchParams = Promise<{ callbackUrl?: string; error?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  const sp = await searchParams;
  if (session?.user) {
    redirect(sp.callbackUrl ?? "/admin");
  }

  async function login(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/admin",
      });
    } catch (error) {
      if (error instanceof AuthError) {
        redirect(`/admin/login?error=CredentialsSignin`);
      }
      throw error;
    }
  }

  const errorMsg =
    sp.error === "CredentialsSignin" ? "Invalid email or password." : null;

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
              <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-1.5">
                Email
              </label>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-[#c9a56a] focus:ring-1 focus:ring-[#c9a56a]/40"
                placeholder="admin@soc-afsec.com"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-1.5">
                Password
              </label>
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-[#c9a56a] focus:ring-1 focus:ring-[#c9a56a]/40"
                placeholder="••••••••"
              />
            </div>

            {errorMsg && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-[#c9a56a] text-black font-semibold py-2.5 rounded-md hover:bg-[#e0c490] transition"
            >
              Sign In
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
