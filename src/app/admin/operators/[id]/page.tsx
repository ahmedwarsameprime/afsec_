import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

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
    if (newPassword && newPassword.length >= 8) {
      data.password = await bcrypt.hash(newPassword, 12);
    }
    await prisma.user.update({ where: { id }, data });
    revalidatePath("/admin/operators");
    revalidatePath(`/admin/operators/${id}`);
  }

  async function remove() {
    "use server";
    await prisma.user.delete({ where: { id } });
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
