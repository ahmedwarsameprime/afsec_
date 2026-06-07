import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate, expiryStatus } from "@/lib/dates";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const guards = await prisma.guard.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { trainings: true } } },
  });

  const total = guards.length;
  const active = guards.filter((g) => g.status === "active").length;
  const expiringSoon = guards.filter((g) => {
    const dates = [
      g.permit1ExpiryDate,
      g.permit2ExpiryDate,
      g.visaExpiryDate,
      g.medicalExpiryDate,
    ];
    return dates.some((d) => {
      const s = expiryStatus(d);
      return s === "soon" || s === "expired";
    });
  }).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Guards</h1>
        <p className="text-sm text-zinc-400">
          Manage employee profiles and generate ID card QR codes.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatCard label="Total" value={total} />
        <StatCard label="Active" value={active} accent="success" />
        <StatCard
          label="Attention"
          value={expiringSoon}
          accent={expiringSoon > 0 ? "warning" : "muted"}
        />
      </div>

      {guards.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-2xl py-16 text-center px-4">
          <div className="text-zinc-500 text-sm mb-4">
            No guards have been added yet.
          </div>
          <Link
            href="/admin/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#c9a56a] text-black font-semibold hover:bg-[#e0c490] transition"
          >
            + Add your first guard
          </Link>
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <ul className="md:hidden space-y-2">
            {guards.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/admin/${g.id}`}
                  className="block bg-[#141414] border border-white/10 rounded-2xl p-4 hover:border-[#c9a56a]/40 transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center text-zinc-600 shrink-0">
                      {g.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={g.photoUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate">
                            {g.firstName} {g.lastName}
                          </div>
                          <div className="text-xs text-[#c9a56a] truncate">
                            {g.jobTitle}
                          </div>
                          {g.employeeId && (
                            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                              {g.employeeId}
                            </div>
                          )}
                        </div>
                        <StatusBadge status={g.status} />
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-1.5 text-[10px]">
                        <ChipRow label="P1" active={g.permit1Active} expiry={g.permit1ExpiryDate} />
                        <ChipRow label="P2" active={g.permit2Active} expiry={g.permit2ExpiryDate} />
                        <ChipRow label="Visa" active={g.visaStatus === "active"} expiry={g.visaExpiryDate} />
                        <ChipRow label="Med" active={true} expiry={g.medicalExpiryDate} />
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden md:block bg-[#141414] border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-black/30 text-xs uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="text-left px-4 py-3">Guard</th>
                    <th className="text-left px-4 py-3">Job Title</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Permits</th>
                    <th className="text-left px-4 py-3">Visa</th>
                    <th className="text-left px-4 py-3">Medical</th>
                    <th className="text-right px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {guards.map((g) => (
                    <tr key={g.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center text-zinc-600">
                            {g.photoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={g.photoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
                              </svg>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-white truncate">
                              {g.firstName} {g.lastName}
                            </div>
                            {g.employeeId && (
                              <div className="text-xs text-zinc-500 font-mono">
                                {g.employeeId}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">{g.jobTitle}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={g.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 items-center">
                          <PermitDot label="P1" active={g.permit1Active} expiry={g.permit1ExpiryDate} />
                          <PermitDot label="P2" active={g.permit2Active} expiry={g.permit2ExpiryDate} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <ExpiryCell active={g.visaStatus === "active"} expiry={g.visaExpiryDate} />
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <ExpiryCell active={true} expiry={g.medicalExpiryDate} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/${g.id}`}
                          className="text-[#c9a56a] hover:text-[#e0c490] text-sm font-medium"
                        >
                          Open →
                        </Link>
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

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "success" | "warning" | "muted";
}) {
  const accentColor =
    accent === "success"
      ? "text-emerald-400"
      : accent === "warning"
        ? "text-amber-400"
        : accent === "muted"
          ? "text-zinc-500"
          : "text-[#c9a56a]";
  return (
    <div className="bg-[#141414] border border-white/10 rounded-2xl p-3 sm:p-4">
      <div className="text-[10px] sm:text-xs uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className={`text-2xl sm:text-3xl font-bold mt-1 ${accentColor}`}>
        {value}
      </div>
    </div>
  );
}

function ChipRow({
  label,
  active,
  expiry,
}: {
  label: string;
  active: boolean;
  expiry: Date | null;
}) {
  const status = !active ? "inactive" : expiryStatus(expiry);
  const styleMap: Record<string, string> = {
    ok: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    soon: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    expired: "bg-red-500/15 text-red-300 border-red-500/30",
    inactive: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
    none: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
  };
  return (
    <span
      className={`inline-flex items-center justify-between gap-1 px-2 py-1 rounded border text-[10px] font-medium ${styleMap[status]}`}
    >
      <span className="font-bold tracking-wider">{label}</span>
      <span className="truncate">
        {!active ? "Inactive" : expiry ? formatDate(expiry).split(" ").slice(1).join(" ") : "—"}
      </span>
    </span>
  );
}

function PermitDot({
  label,
  active,
  expiry,
}: {
  label: string;
  active: boolean;
  expiry: Date | null;
}) {
  const status = !active ? "inactive" : expiryStatus(expiry);
  const colorMap: Record<string, string> = {
    ok: "bg-emerald-500/15 text-emerald-300",
    soon: "bg-amber-500/15 text-amber-300",
    expired: "bg-red-500/15 text-red-300",
    inactive: "bg-zinc-500/15 text-zinc-400",
    none: "bg-zinc-500/15 text-zinc-500",
  };
  return (
    <span
      title={`${label}: ${status}`}
      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${colorMap[status]}`}
    >
      {label}
    </span>
  );
}

function ExpiryCell({ active, expiry }: { active: boolean; expiry: Date | null }) {
  if (!active) return <span className="text-zinc-500">Inactive</span>;
  if (!expiry) return <span className="text-zinc-500">—</span>;
  const status = expiryStatus(expiry);
  const color =
    status === "expired"
      ? "text-red-400"
      : status === "soon"
        ? "text-amber-400"
        : "text-zinc-300";
  return <span className={color}>{formatDate(expiry)}</span>;
}
