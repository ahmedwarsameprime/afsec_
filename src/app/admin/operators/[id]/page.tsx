import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/audit";

type Params = Promise<{ id: string }>;
export const dynamic = "force-dynamic";

export default async function OperatorEditPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: { location: true, _count: { select: { scanLogs: true } } },
  });
  if (!user || user.role !== "operator") notFound();

  const locations = await prisma.location.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  async function save(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim() || null;
    const locationId = String(formData.get("locationId") ?? "").trim() || null;
    const newPassword = String(formData.get("newPassword") ?? "");

    const data: Record<string, unknown> = { name, locationId };
    const passwordReset = newPassword && newPassword.length >= 8;
    if (passwordReset) {
      data.password = await bcrypt.hash(newPassword, 12);
      data.mustChangePassword = true;
    }
    await prisma.user.update({ where: { id }, data });
    await logAdminAction({
      action: passwordReset ? "operator.password_reset" : "operator.update",
      entityType: "operator",
      entityId: id,
      summary: passwordReset ? `Password reset for ${user!.email}` : `Updated operator ${user!.email}`,
    });
    revalidatePath("/admin/operators");
    revalidatePath(`/admin/operators/${id}`);
  }

  async function unlock() {
    "use server";
    await prisma.user.update({ where: { id }, data: { lockedAt: null, lockReason: null } });
    await logAdminAction({
      action: "operator.update",
      entityType: "operator",
      entityId: id,
      summary: `Unlocked account ${user!.email}`,
    });
    revalidatePath(`/admin/operators/${id}`);
  }

  async function disable2fa() {
    "use server";
    await prisma.user.update({
      where: { id },
      data: { totpEnabled: false, totpSecret: null, totpEnrolledAt: null },
    });
    await logAdminAction({
      action: "operator.update",
      entityType: "operator",
      entityId: id,
      summary: `Disabled 2FA for ${user!.email} (operator lost device)`,
    });
    revalidatePath(`/admin/operators/${id}`);
  }

  async function remove() {
    "use server";
    const target = await prisma.user.findUnique({ where: { id } });
    await prisma.user.delete({ where: { id } });
    await logAdminAction({
      action: "operator.delete",
      entityType: "operator",
      entityId: id,
      summary: target ? `Deleted operator ${target.email}` : `Deleted operator ${id}`,
    });
    redirect("/admin/operators");
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link href="/admin/operators" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← All operators
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold mt-1">{user.name ?? user.email}</h1>
        <div className="text-sm text-zinc-400">{user.email}</div>
      </div>

      <form action={save} className="bg-[#141414] border border-white/10 rounded-2xl p-6 space-y-4">
        <Field label="Display Name">
          <Input name="name" defaultValue={user.name ?? ""} />
        </Field>
        <Field label="Assigned Location">
          <select
            name="locationId"
            defaultValue={user.locationId ?? ""}
            className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-[#c9a56a]"
          >
            <option value="">— None —</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.type})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Reset Password">
          <Input
            type="text"
            name="newPassword"
            placeholder="Leave blank to keep current"
            minLength={8}
          />
          <div className="text-xs text-zinc-500 mt-1">
            Minimum 8 characters. Operator will need to sign in again on their
            device with the new password.
          </div>
        </Field>

        <div className="pt-2">
          <button
            type="submit"
            className="bg-[#c9a56a] text-black font-semibold px-5 py-2.5 rounded-md hover:bg-[#e0c490] transition"
          >
            Save Changes
          </button>
        </div>
      </form>

      <div className="text-xs text-zinc-500">
        {user._count.scanLogs} scan{user._count.scanLogs === 1 ? "" : "s"} recorded under this operator.
      </div>

      <section className="bg-[#141414] border border-white/10 rounded-2xl p-5 space-y-4">
        <h2 className="text-xs uppercase tracking-wider text-[#c9a56a] font-semibold">Security</h2>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm text-white">
              Account status:{" "}
              {user.lockedAt
                ? <span className="text-red-300 font-semibold">LOCKED</span>
                : <span className="text-emerald-300">Active</span>}
            </div>
            {user.lockedAt && (
              <div className="text-xs text-zinc-500 mt-1">
                Locked {user.lockedAt.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                {user.lockReason ? ` — ${user.lockReason}` : ""}
              </div>
            )}
          </div>
          {user.lockedAt && (
            <form action={unlock}>
              <button type="submit"
                className="text-sm font-medium px-3 py-1.5 rounded-md border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10">
                Unlock account
              </button>
            </form>
          )}
        </div>
        <div className="flex items-start justify-between gap-3 flex-wrap pt-3 border-t border-white/5">
          <div>
            <div className="text-sm text-white">
              Two-factor:{" "}
              {user.totpEnabled
                ? <span className="text-emerald-300 font-semibold">ENABLED</span>
                : <span className="text-zinc-400">Not set up</span>}
            </div>
            {user.totpEnrolledAt && (
              <div className="text-xs text-zinc-500 mt-1">
                Enrolled {user.totpEnrolledAt.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
              </div>
            )}
          </div>
          {user.totpEnabled && (
            <form action={disable2fa}>
              <button type="submit"
                className="text-sm font-medium px-3 py-1.5 rounded-md border border-amber-500/40 text-amber-300 hover:bg-amber-500/10">
                Reset 2FA
              </button>
            </form>
          )}
        </div>
      </section>

      <section className="bg-[#141414] rounded-2xl border border-red-500/30 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5">
          <h2 className="text-xs uppercase tracking-wider text-red-300 font-semibold">
            Danger Zone
          </h2>
        </div>
        <form action={remove} className="p-5">
          <button
            type="submit"
            className="text-sm font-medium px-4 py-2 rounded-md border border-red-500/40 text-red-300 hover:bg-red-500/10 transition"
          >
            Delete this operator
          </button>
          <p className="text-xs text-zinc-500 mt-2">
            All scan logs from this operator are also deleted.
          </p>
        </form>
      </section>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1.5">
        {label} {required && <span className="text-[#c9a56a]">*</span>}
      </div>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-[#c9a56a]"
    />
  );
}
