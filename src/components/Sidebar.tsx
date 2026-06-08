"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";

type User = {
  name?: string | null;
  email?: string | null;
  role?: "admin" | "operator";
};

const NAV: Array<{ label: string; href: string; icon: React.ReactNode }> = [
  {
    label: "Guards",
    href: "/admin",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    ),
  },
  {
    label: "Locations",
    href: "/admin/locations",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
    ),
  },
  {
    label: "Operators",
    href: "/admin/operators",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    ),
  },
  {
    label: "Scan Logs",
    href: "/admin/logs",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    ),
  },
];

export function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Mobile open button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="lg:hidden fixed left-3 top-3 z-30 inline-flex items-center justify-center w-9 h-9 rounded-md bg-[#141414] border border-white/10 text-zinc-300 hover:bg-white/5"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#0d0d0d] border-r border-white/10 flex flex-col transform transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand */}
        <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-3" onClick={() => setOpen(false)}>
            <Logo size={30} />
          </Link>
          {/* Mobile close */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="lg:hidden text-zinc-400 hover:text-white"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="text-[10px] uppercase tracking-wider text-zinc-600 px-2 pb-2">
            CRM Console
          </div>
          <ul className="space-y-1">
            {NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
                      active
                        ? "bg-[#c9a56a]/10 text-[#c9a56a] font-medium border border-[#c9a56a]/30"
                        : "text-zinc-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className={active ? "text-[#c9a56a]" : "text-zinc-500"}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-6">
            <div className="text-[10px] uppercase tracking-wider text-zinc-600 px-2 pb-2">
              Quick Actions
            </div>
            <Link
              href="/admin/new"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
              New Guard
            </Link>
          </div>
        </nav>

        {/* User footer */}
        <div className="border-t border-white/10 px-4 py-4">
          <div className="text-xs text-zinc-500 mb-1.5">Signed in as</div>
          <div className="text-sm text-white truncate">
            {user.name ?? user.email ?? "—"}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-0.5">
            {user.role ?? "admin"}
          </div>
          <button
            type="button"
            onClick={async () => {
              const { signOut } = await import("next-auth/react");
              await signOut({ callbackUrl: "/admin/login" });
            }}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-white/10 text-sm text-zinc-300 hover:bg-white/5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
