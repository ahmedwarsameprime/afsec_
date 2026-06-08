import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OperatorsPage() {
  const users = await prisma.user.findMany({
    where: { role: "operator" },
    orderBy: { createdAt: "desc" },
    include: { location: true, _count: { select: { scanLogs: true } } },
  });

  const admins = await prisma.user.findMany({
    where: { role: "admin" },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Operator Accounts</h1>
          <p className="text-sm text-zinc-400">
            Operators sign in on a device and scan guard QRs. Every scan is
            logged against their assigned location.
          </p>
        </div>
        <Link
          href="/admin/operators/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#c9a56a] text-black font-semibold hover:bg-[#e0c490] transition text-sm"
        >
          + New Operator
        </Link>
      </div>

      <section className="bg-[#141414] rounded-2xl border border-white/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5">
          <h2 className="text-xs uppercase tracking-wider text-[#c9a56a] font-semibold">
            Operators ({users.length})
          </h2>
        </div>
        {users.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-zinc-500">
            No operator accounts yet.
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {users.map((u) => (
              <li key={u.id}>
                <Link
                  href={`/admin/operators/${u.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.02]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-white truncate">
                      {u.name ?? u.email}
                    </div>
                    <div className="text-xs text-zinc-500 truncate">
                      {u.email}
                    </div>
                    <div className="mt-1 text-xs">
                      {u.location ? (
                        <span className="text-zinc-300">
                          <span className="text-zinc-600">@</span> {u.location.name}{" "}
                          <span className="ml-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                            {u.location.type}
                          </span>
                        </span>
                      ) : (
                        <span className="text-amber-400">⚠ no location</span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-500 shrink-0">
                    {u._count.scanLogs} scan{u._count.scanLogs === 1 ? "" : "s"}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-[#141414] rounded-2xl border border-white/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5">
          <h2 className="text-xs uppercase tracking-wider text-[#c9a56a] font-semibold">
            Admins ({admins.length})
          </h2>
        </div>
        <ul className="divide-y divide-white/5">
          {admins.map((u) => (
            <li key={u.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-sm text-white">{u.name ?? u.email}</div>
                <div className="text-xs text-zinc-500">{u.email}</div>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#c9a56a]/10 text-[#c9a56a] border border-[#c9a56a]/30">
                ADMIN
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
