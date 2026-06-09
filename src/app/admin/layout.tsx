import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { Logo } from "@/components/Logo";
import { Sidebar } from "@/components/Sidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // /admin/login renders its own layout (no sidebar there).
  if (!session?.user) {
    return <>{children}</>;
  }

  const role = session.user.role ?? "admin";

  // Operators don't belong in /admin — bounce to scan landing.
  if (role === "operator") {
    redirect("/scan");
  }

  // Note: we intentionally still render the sidebar when mustChangePassword
  // is true. The proxy redirects them to /admin/password regardless of
  // which sidebar link they click, so they can't escape the password
  // change — but the chrome stays visible (no jarring "disappearing menu").

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#0a0a0a]">
      <Sidebar user={session.user} />

      <div className="flex-1 min-w-0 lg:pl-72">
        <header className="lg:hidden border-b border-white/10 bg-black/40 backdrop-blur sticky top-0 z-20">
          <div className="px-4 py-3 flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-3">
              <Logo size={28} />
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/admin/login" });
              }}
            >
              <button type="submit" aria-label="Sign out"
                className="inline-flex items-center justify-center w-9 h-9 rounded-md text-zinc-400 hover:text-white hover:bg-white/5 transition">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </button>
            </form>
          </div>
        </header>

        <main className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-6xl">{children}</main>
      </div>
    </div>
  );
}
