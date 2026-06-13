import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { deleteUpload } from "@/lib/storage";
import { logAdminAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export default async function TrashPage() {
  const deleted = await prisma.guard.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
  });

  async function restore(id: string) {
    "use server";
    const target = await prisma.guard.findUnique({ where: { id } });
    if (!target?.deletedAt) return;
    await prisma.guard.update({ where: { id }, data: { deletedAt: null } });
    await logAdminAction({
      action: "guard.update",
      entityType: "guard",
      entityId: id,
      summary: `Restored ${target.firstName} ${target.lastName} from trash`,
    });
    revalidatePath("/admin/trash");
    revalidatePath("/admin");
    redirect(`/admin/${id}`);
  }

  async function purge(id: string) {
    "use server";
    const g = await prisma.guard.findUnique({
      where: { id },
      include: {
        trainings: { select: { documentUrl: true } },
        documents: { select: { documentUrl: true } },
      },
    });
    if (!g) return;
    await deleteUpload(g.photoUrl);
    await deleteUpload(g.permit1DocumentUrl);
    await deleteUpload(g.permit2DocumentUrl);
    await deleteUpload(g.visaDocumentUrl);
    await deleteUpload(g.medicalDocumentUrl);
    for (const t of g.trainings) await deleteUpload(t.documentUrl);
    for (const d of g.documents) await deleteUpload(d.documentUrl);
    await prisma.guard.delete({ where: { id } });
    await logAdminAction({
      action: "guard.delete",
      entityType: "guard",
      entityId: id,
      summary: `Permanently purged ${g.firstName} ${g.lastName}`,
    });
    revalidatePath("/admin/trash");
  }

  async function purgeExpired() {
    "use server";
    const cutoff = new Date(Date.now() - RETENTION_MS);
    const expired = await prisma.guard.findMany({
      where: { deletedAt: { lt: cutoff } },
      include: {
        trainings: { select: { documentUrl: true } },
        documents: { select: { documentUrl: true } },
      },
    });
    for (const g of expired) {
      await deleteUpload(g.photoUrl);
      await deleteUpload(g.permit1DocumentUrl);
      await deleteUpload(g.permit2DocumentUrl);
      await deleteUpload(g.visaDocumentUrl);
      await deleteUpload(g.medicalDocumentUrl);
      for (const t of g.trainings) await deleteUpload(t.documentUrl);
    for (const d of g.documents) await deleteUpload(d.documentUrl);
      await prisma.guard.delete({ where: { id: g.id } });
    }
    if (expired.length > 0) {
      await logAdminAction({
        action: "guard.delete",
        entityType: "guard",
        entityId: null,
        summary: `Auto-purged ${expired.length} expired soft-deleted guards`,
      });
    }
    revalidatePath("/admin/trash");
  }

  const cutoff = Date.now() - RETENTION_MS;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Trash</h1>
        <p className="text-sm text-zinc-400">
          Deleted guards stay here for 30 days, then are purged permanently.
        </p>
      </div>

      <form action={purgeExpired}>
        <button type="submit"
          className="text-xs font-medium px-3 py-1.5 rounded-md border border-white/20 text-zinc-300 hover:bg-white/5">
          Run cleanup — purge entries older than 30 days
        </button>
      </form>

      {deleted.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-2xl py-16 text-center text-sm text-zinc-500">
          Trash is empty.
        </div>
      ) : (
        <ul className="space-y-2">
          {deleted.map((g) => {
            const deletedAt = g.deletedAt!.getTime();
            const expired = deletedAt < cutoff;
            const daysLeft = Math.max(0, Math.ceil((deletedAt + RETENTION_MS - Date.now()) / (1000 * 60 * 60 * 24)));
            return (
              <li key={g.id}
                className={`bg-[#141414] border rounded-2xl p-4 ${expired ? "border-red-500/30" : "border-white/10"}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-sm font-semibold text-white">{g.firstName} {g.lastName}</div>
                    <div className="text-xs text-zinc-500">
                      {g.jobTitle}{g.employeeId ? ` · ${g.employeeId}` : ""}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                      Deleted {g.deletedAt!.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })} ·{" "}
                      {expired ? <span className="text-red-400">past retention</span>
                        : <span>{daysLeft} day{daysLeft === 1 ? "" : "s"} left</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <form action={async () => { "use server"; await restore(g.id); }}>
                      <button type="submit"
                        className="text-xs font-medium px-3 py-1.5 rounded-md border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10">
                        Restore
                      </button>
                    </form>
                    <form action={async () => { "use server"; await purge(g.id); }}>
                      <button type="submit"
                        className="text-xs font-medium px-3 py-1.5 rounded-md border border-red-500/40 text-red-300 hover:bg-red-500/10">
                        Purge now
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
