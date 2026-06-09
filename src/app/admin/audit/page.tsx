import { prisma } from "@/lib/prisma";

type SearchParams = Promise<{
  actor?: string;
  entityType?: string;
  q?: string;
  from?: string;
  to?: string;
}>;

export const dynamic = "force-dynamic";

export default async function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const where: Record<string, unknown> = {};
  if (sp.actor) where.actorId = sp.actor;
  if (sp.entityType && sp.entityType !== "all") where.entityType = sp.entityType;
  if (sp.q && sp.q.trim()) {
    const q = sp.q.trim();
    where.OR = [
      { summary: { contains: q, mode: "insensitive" } },
      { action: { contains: q, mode: "insensitive" } },
    ];
  }
  if (sp.from || sp.to) {
    const range: { gte?: Date; lte?: Date } = {};
    if (sp.from) {
      const d = new Date(sp.from);
      if (!isNaN(d.getTime())) range.gte = d;
    }
    if (sp.to) {
      const d = new Date(sp.to);
      if (!isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999);
        range.lte = d;
      }
    }
    where.at = range;
  }

  const [entries, actors] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { at: "desc" },
      take: 200,
      include: { actor: { select: { email: true, name: true, role: true } } },
    }),
    prisma.user.findMany({
      where: { role: "admin" },
      orderBy: { email: "asc" },
      select: { id: true, email: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Admin Audit</h1>
        <p className="text-sm text-zinc-400">
          Every change to guards, operators, locations and account passwords is recorded here.
        </p>
      </div>

      <form
        method="GET"
        className="bg-[#141414] border border-white/10 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
      >
        <Field label="Search">
          <input name="q" defaultValue={sp.q ?? ""} placeholder="action or summary"
            className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-[#c9a56a]" />
        </Field>
        <Field label="Actor">
          <select name="actor" defaultValue={sp.actor ?? ""}
            className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-[#c9a56a]">
            <option value="">All admins</option>
            {actors.map((a) => <option key={a.id} value={a.id}>{a.name ?? a.email}</option>)}
          </select>
        </Field>
        <Field label="Entity">
          <select name="entityType" defaultValue={sp.entityType ?? "all"}
            className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-[#c9a56a]">
            <option value="all">All</option>
            <option value="guard">Guard</option>
            <option value="operator">Operator</option>
            <option value="location">Location</option>
            <option value="user">User (password/login)</option>
            <option value="training">Training</option>
          </select>
        </Field>
        <Field label="From">
          <input type="date" name="from" defaultValue={sp.from ?? ""}
            className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-[#c9a56a]" />
        </Field>
        <Field label="To">
          <input type="date" name="to" defaultValue={sp.to ?? ""}
            className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-[#c9a56a]" />
        </Field>
        <div className="lg:col-span-5 flex items-center gap-2">
          <button type="submit"
            className="bg-[#c9a56a] text-black font-semibold px-4 py-2 rounded-md hover:bg-[#e0c490] transition text-sm">
            Apply
          </button>
          <a href="/admin/audit" className="text-sm text-zinc-400 hover:text-white">Reset</a>
          <span className="ml-auto text-xs text-zinc-500">Showing {entries.length} most recent</span>
        </div>
      </form>

      {entries.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-2xl py-16 text-center text-sm text-zinc-500">
          No audit entries match these filters.
        </div>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => (
            <li key={e.id} className="bg-[#141414] border border-white/10 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-[#c9a56a]/10 text-[#c9a56a] border border-[#c9a56a]/30">
                      {e.action}
                    </code>
                    <span className="text-xs text-zinc-500">
                      by <span className="text-zinc-300">{e.actor?.name ?? e.actor?.email ?? "system"}</span>
                    </span>
                  </div>
                  {e.summary && <div className="text-sm text-white mt-1.5">{e.summary}</div>}
                  {e.changes && Object.keys(e.changes as object).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-zinc-400 cursor-pointer hover:text-white">
                        View field changes
                      </summary>
                      <div className="mt-2 bg-black/40 rounded-md p-2 text-[11px] font-mono text-zinc-300 overflow-x-auto">
                        {Object.entries(e.changes as Record<string, [unknown, unknown]>).map(([k, [b, a]]) => (
                          <div key={k} className="py-0.5">
                            <span className="text-zinc-500">{k}:</span>{" "}
                            <span className="text-red-300">{String(b ?? "—")}</span>{" "}
                            <span className="text-zinc-600">→</span>{" "}
                            <span className="text-emerald-300">{String(a ?? "—")}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
                <div className="text-xs text-zinc-500 text-right shrink-0">
                  <div>{e.at.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</div>
                  {e.ipAddress && <div className="font-mono text-[10px] text-zinc-600 mt-0.5">{e.ipAddress}</div>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">{label}</div>
      {children}
    </label>
  );
}
