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

  // /admin/login renders its own layout — but the layout still wraps it.
  // We hide the chrome on the login route by checking session presence.
  if (!session?.user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-3">
            <Logo size={32} />
            <span className="hidden sm:inline text-xs uppercase tracking-wider text-zinc-500 border-l border-white/10 pl-3">
              CRM Console
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-sm text-zinc-300 hover:text-white"
            >
              Guards
            </Link>
            <Link
              href="/admin/new"
              className="text-sm font-medium px-3 py-1.5 rounded-md bg-[#c9a56a] text-black hover:bg-[#e0c490] transition"
            >
              + New Guard
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/admin/login" });
              }}
            >
              <button
                type="submit"
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
