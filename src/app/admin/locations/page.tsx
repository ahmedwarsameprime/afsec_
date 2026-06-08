import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function LocationsPage() {
  const locations = await prisma.location.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { operators: true, scanLogs: true } },
    },
  });

  const sites = locations.filter((l) => l.type === "site");
  const armories = locations.filter((l) => l.type === "armory");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Locations</h1>
          <p className="text-sm text-zinc-400">
            Sites are check-in points. Armories log weapon issuance and require a
            serial-number confirmation.
          </p>
        </div>
        <Link
          href="/admin/locations/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#c9a56a] text-black font-semibold hover:bg-[#e0c490] transition text-sm"
        >
          + New Location
        </Link>
      </div>

      <LocationGroup title="Sites" items={sites} type="site" />
      <LocationGroup title="Armories" items={armories} type="armory" />
    </div>
  );
}

function LocationGroup({
  title,
  items,
  type,
}: {
  title: string;
  items: Array<{
    id: string;
    name: string;
    code: string | null;
    type: string;
    notes: string | null;
    _count: { operators: number; scanLogs: number };
  }>;
  type: "site" | "armory";
}) {
  return (
    <section className="bg-[#141414] rounded-2xl border border-white/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5">
        <h2 className="text-xs uppercase tracking-wider text-[#c9a56a] font-semibold">
          {title} ({items.length})
        </h2>
      </div>
      {items.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-zinc-500">
          No {type === "armory" ? "armories" : "sites"} yet.
        </div>
      ) : (
        <ul className="divide-y divide-white/5">
          {items.map((l) => (
            <li key={l.id}>
              <Link
                href={`/admin/locations/${l.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.02]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-white truncate">
                      {l.name}
                    </span>
                    {l.code && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-zinc-400">
                        {l.code}
                      </span>
                    )}
                  </div>
                  {l.notes && (
                    <div className="text-xs text-zinc-500 mt-0.5 truncate">
                      {l.notes}
                    </div>
                  )}
                </div>
                <div className="text-xs text-zinc-500 text-right shrink-0">
                  <div>{l._count.operators} operator{l._count.operators === 1 ? "" : "s"}</div>
                  <div>{l._count.scanLogs} scan{l._count.scanLogs === 1 ? "" : "s"}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
