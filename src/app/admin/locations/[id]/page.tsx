import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

type Params = Promise<{ id: string }>;
export const dynamic = "force-dynamic";

export default async function LocationEditPage({ params }: { params: Params }) {
  const { id } = await params;
  const location = await prisma.location.findUnique({
    where: { id },
    include: {
      _count: { select: { scanLogs: true } },
      operators: { select: { id: true, email: true, name: true } },
    },
  });
  if (!location) notFound();

  async function save(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    const code = String(formData.get("code") ?? "").trim() || null;
    const type = String(formData.get("type") ?? "site").trim();
    const notes = String(formData.get("notes") ?? "").trim() || null;
    if (!name) return;
    if (type !== "site" && type !== "armory") return;

    await prisma.location.update({
      where: { id },
      data: { name, code, type, notes },
    });
    revalidatePath("/admin/locations");
    revalidatePath(`/admin/locations/${id}`);
  }

  async function remove() {
    "use server";
    await prisma.location.delete({ where: { id } });
    redirect("/admin/locations");
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/admin/locations" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← All locations
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold mt-1">{location.name}</h1>
        <div className="text-sm text-zinc-400 capitalize">{location.type}</div>
      </div>

      <form action={save} className="bg-[#141414] border border-white/10 rounded-2xl p-6 space-y-4">
        <Field label="Name" required>
          <Input name="name" defaultValue={location.name} required />
        </Field>
        <Field label="Code">
          <Input name="code" defaultValue={location.code ?? ""} placeholder="e.g. HIC-01" />
        </Field>
        <Field label="Type" required>
          <select
            name="type"
            defaultValue={location.type}
            className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-[#c9a56a]"
          >
            <option value="site">Site (check-in / verification)</option>
            <option value="armory">Armory (weapon issuance)</option>
          </select>
        </Field>
        <Field label="Notes">
          <textarea
            name="notes"
            rows={3}
            defaultValue={location.notes ?? ""}
            className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-[#c9a56a]"
          />
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

      {/* Operators bound to this location */}
      <section className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-wider text-[#c9a56a] font-semibold">
            Operators ({location.operators.length})
          </h2>
          <Link
            href={`/admin/operators/new?locationId=${location.id}`}
            className="text-xs font-medium px-3 py-1.5 rounded-md bg-[#c9a56a]/10 text-[#c9a56a] border border-[#c9a56a]/30 hover:bg-[#c9a56a]/20"
          >
            + Add Operator
          </Link>
        </div>
        {location.operators.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-zinc-500">
            No operators assigned yet.
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {location.operators.map((o) => (
              <li key={o.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm text-white">{o.name ?? o.email}</div>
                  <div className="text-xs text-zinc-500">{o.email}</div>
                </div>
                <Link
                  href={`/admin/operators/${o.id}`}
                  className="text-xs text-[#c9a56a] hover:text-[#e0c490]"
                >
                  Manage →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="text-xs text-zinc-500">
        {location._count.scanLogs} scan log entr{location._count.scanLogs === 1 ? "y" : "ies"} recorded here.
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
            Delete this location
          </button>
          <p className="text-xs text-zinc-500 mt-2">
            All scan logs for this location are also deleted. Operators bound here
            become unbound (their account stays but loses location).
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
