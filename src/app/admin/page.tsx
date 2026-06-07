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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Total Guards" value={total} />
        <StatCard label="Active" value={active} accent="success" />
        <StatCard
          label="Needs Attention"
          value={expiringSoon}
          accent={expiringSoon > 0 ? "warning" : "muted"}
        />
      </div>

      {/* Table */}
      {guards.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-2xl py-16 text-center">
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
        <div className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden">
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
    <div className="bg-[#141414] border border-white/10 rounded-2xl p-4">
      <div className="text-xs uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className={`text-3xl font-bold mt-1 ${accentColor}`}>{value}</div>
    </div>
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
