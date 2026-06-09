import Link from "next/link";
import { prisma } from "@/lib/prisma";

type SearchParams = Promise<{
  location?: string;
  type?: string;
  q?: string;
  from?: string;
  to?: string;
}>;

export const dynamic = "force-dynamic";

export default async function ScanLogsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const locations = await prisma.location.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  // Build filters.
  const where: Record<string, unknown> = {};
  if (sp.location) where.locationId = sp.location;
  const VALID_TYPES = [
    "site_in",
    "site_out",
    "entry_denied",
    "armory_out",
    "armory_in",
    "armory_denied",
    "verification", // legacy
  ];
  if (sp.type && VALID_TYPES.includes(sp.type)) {
    where.scanType = sp.type;
  }
  // Convenience group filters
  if (sp.type === "site_any") {
    where.scanType = {
      in: ["site_in", "site_out", "verification", "entry_denied"],
    };
  }
  if (sp.type === "armory_any") {
    where.scanType = { in: ["armory_out", "armory_in", "armory_denied"] };
  }
  if (sp.type === "denied_any") {
    where.scanType = { in: ["entry_denied", "armory_denied"] };
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
    where.scannedAt = range;
  }

  if (sp.q && sp.q.trim()) {
    const q = sp.q.trim();
    where.guard = {
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { employeeId: { contains: q, mode: "insensitive" } },
      ],
    };
  }

  const logs = await prisma.scanLog.findMany({
    where,
    orderBy: { scannedAt: "desc" },
    take: 200,
    include: {
      guard: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
        },
      },
      location: { select: { name: true, type: true, code: true } },
      scannedBy: { select: { email: true, name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Scan Logs</h1>
        <p className="text-sm text-zinc-400">
          Every scan at a site or armory is recorded here.
        </p>
      </div>

      {/* Filter bar */}
      <form
        method="GET"
        className="bg-[#141414] border border-white/10 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
      >
        <FilterField label="Search guard">
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Name or employee ID"
            className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-[#c9a56a]"
          />
        </FilterField>
        <FilterField label="Location">
          <select
            name="location"
            defaultValue={sp.location ?? ""}
            className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-[#c9a56a]"
          >
            <option value="">All locations</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.type})
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Type">
          <select
            name="type"
            defaultValue={sp.type ?? ""}
            className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-[#c9a56a]"
          >
            <option value="">All types</option>
            <option value="denied_any">⛔ Any denied attempt</option>
            <optgroup label="Site">
              <option value="site_any">Any site scan</option>
              <option value="site_in">Entry</option>
              <option value="site_out">Exit</option>
              <option value="entry_denied">Entry denied</option>
              <option value="verification">Legacy verification</option>
            </optgroup>
            <optgroup label="Armory">
              <option value="armory_any">Any armory scan</option>
              <option value="armory_out">Weapon issued</option>
              <option value="armory_in">Weapon returned</option>
              <option value="armory_denied">Issuance denied</option>
            </optgroup>
          </select>
        </FilterField>
        <FilterField label="From">
          <input
            type="date"
            name="from"
            defaultValue={sp.from ?? ""}
            className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-[#c9a56a]"
          />
        </FilterField>
        <FilterField label="To">
          <input
            type="date"
            name="to"
            defaultValue={sp.to ?? ""}
            className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-[#c9a56a]"
          />
        </FilterField>
        <div className="lg:col-span-5 flex items-center gap-2">
          <button
            type="submit"
            className="bg-[#c9a56a] text-black font-semibold px-4 py-2 rounded-md hover:bg-[#e0c490] transition text-sm"
          >
            Apply filters
          </button>
          <Link
            href="/admin/logs"
            className="text-sm text-zinc-400 hover:text-white"
          >
            Reset
          </Link>
          <span className="ml-auto text-xs text-zinc-500">
            Showing {logs.length} most recent
          </span>
        </div>
      </form>

      {logs.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-2xl py-16 text-center text-sm text-zinc-500">
          No scans match these filters.
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="md:hidden space-y-2">
            {logs.map((l) => (
              <li
                key={l.id}
                className="bg-[#141414] border border-white/10 rounded-2xl p-4"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <Link
                      href={`/admin/${l.guardId}`}
                      className="text-sm font-semibold text-white hover:text-[#c9a56a]"
                    >
                      {l.guard.firstName} {l.guard.lastName}
                    </Link>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      {l.guard.employeeId ?? "—"}
                    </div>
                  </div>
                  <ScanTypeBadge type={l.scanType} />
                </div>
                <div className="mt-2 text-xs text-zinc-400 space-y-0.5">
                  <div>
                    <span className="text-zinc-600">@</span> {l.location.name}
                  </div>
                  <div>
                    <span className="text-zinc-600">by</span>{" "}
                    {l.scannedBy.name ?? l.scannedBy.email}
                  </div>
                  {l.weaponSerial && (
                    <div>
                      <span className="text-zinc-600">Weapon:</span>{" "}
                      <span className="font-mono">{l.weaponSerial}</span>
                    </div>
                  )}
                  <div className="text-zinc-500">
                    {l.scannedAt.toLocaleString("en-GB", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* Desktop table */}
          <div className="hidden md:block bg-[#141414] border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-black/30 text-xs uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="text-left px-4 py-3">When</th>
                    <th className="text-left px-4 py-3">Guard</th>
                    <th className="text-left px-4 py-3">ID</th>
                    <th className="text-left px-4 py-3">Location</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-left px-4 py-3">Weapon</th>
                    <th className="text-left px-4 py-3">Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {logs.map((l) => (
                    <tr key={l.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 text-xs text-zinc-300 whitespace-nowrap">
                        {l.scannedAt.toLocaleString("en-GB", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/admin/${l.guardId}`}
                          className="text-white hover:text-[#c9a56a]"
                        >
                          {l.guard.firstName} {l.guard.lastName}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-zinc-500 font-mono">
                        {l.guard.employeeId ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-zinc-300">
                        {l.location.name}
                      </td>
                      <td className="px-4 py-2.5">
                        <ScanTypeBadge type={l.scanType} />
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono text-zinc-300">
                        {l.weaponSerial ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-zinc-400">
                        {l.scannedBy.name ?? l.scannedBy.email}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
        {label}
      </div>
      {children}
    </label>
  );
}

function ScanTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    site_in: { label: "Entry", cls: "bg-emerald-500/15 text-emerald-300" },
    site_out: { label: "Exit", cls: "bg-sky-500/15 text-sky-300" },
    entry_denied: {
      label: "⛔ Denied entry",
      cls: "bg-red-500/20 text-red-300 border border-red-500/40",
    },
    verification: {
      label: "Verify",
      cls: "bg-emerald-500/15 text-emerald-300",
    },
    armory_out: { label: "Weapon out", cls: "bg-red-500/15 text-red-300" },
    armory_in: { label: "Weapon in", cls: "bg-sky-500/15 text-sky-300" },
    armory_denied: {
      label: "⛔ Denied",
      cls: "bg-red-500/20 text-red-300 border border-red-500/40",
    },
  };
  const s = map[type] ?? { label: type, cls: "bg-zinc-500/15 text-zinc-300" };
  return (
    <span
      className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${s.cls}`}
    >
      {s.label}
    </span>
  );
}
