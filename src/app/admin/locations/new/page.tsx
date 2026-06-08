import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default function NewLocationPage() {
  async function create(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    const code = String(formData.get("code") ?? "").trim() || null;
    const type = String(formData.get("type") ?? "site").trim();
    const notes = String(formData.get("notes") ?? "").trim() || null;

    if (!name) return;
    if (type !== "site" && type !== "armory") return;

    const created = await prisma.location.create({
      data: { name, code, type, notes },
    });
    redirect(`/admin/locations/${created.id}`);
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link
          href="/admin/locations"
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          ← All locations
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold mt-1">New Location</h1>
      </div>

      <form
        action={create}
        className="bg-[#141414] border border-white/10 rounded-2xl p-6 space-y-4"
      >
        <Field label="Name" required>
          <Input name="name" required autoFocus placeholder="e.g. Hassan Industries Compound" />
        </Field>
        <Field label="Code">
          <Input name="code" placeholder="e.g. HIC-01" />
        </Field>
        <Field label="Type" required>
          <select
            name="type"
            defaultValue="site"
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
            className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-[#c9a56a]"
            placeholder="Optional context (address, hours, contact)"
          />
        </Field>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="bg-[#c9a56a] text-black font-semibold px-5 py-2.5 rounded-md hover:bg-[#e0c490] transition"
          >
            Create Location
          </button>
          <Link
            href="/admin/locations"
            className="text-sm text-zinc-400 hover:text-white"
          >
            Cancel
          </Link>
        </div>
      </form>
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
