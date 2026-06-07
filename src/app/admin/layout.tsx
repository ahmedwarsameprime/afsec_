import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // /admin/login renders its own layout.
  if (!session?.user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-2">
          <Link href="/admin" className="flex items-center gap-3 min-w-0">
            <Logo size={30} />
            <span className="hidden lg:inline text-xs uppercase tracking-wider text-zinc-500 border-l border-white/10 pl-3">
              CRM Console
            </span>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <Link
              href="/admin/new"
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md bg-[#c9a56a] text-black hover:bg-[#e0c490] transition"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
              <span className="hidden sm:inline">New Guard</span>
            </Link>

            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/admin/login" });
              }}
            >
              <button
                type="submit"
                aria-label="Sign out"
                title="Sign out"
                className="inline-flex items-center justify-center w-9 h-9 rounded-md text-zinc-400 hover:text-white hover:bg-white/5 transition"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {children}
      </main>
    </div>
  );
}
