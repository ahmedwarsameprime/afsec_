import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { logAdminAction } from "@/lib/audit";

type SearchParams = Promise<{ locationId?: string }>;

export const dynamic = "force-dynamic";

export default async function NewOperatorPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const locations = await prisma.location.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  const preselect = sp.locationId ?? "";

  async function create(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").toLowerCase().trim();
    const name = String(formData.get("name") ?? "").trim() || null;
    const password = String(formData.get("password") ?? "");
    const locationId = String(formData.get("locationId") ?? "").trim() || null;

    if (!email || password.length < 8) return;
    if (!locationId) return;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      // Email already taken — bounce back. Real version would surface this.
      redirect(`/admin/operators/new?error=email_taken`);
    }

    const hash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        password: hash,
        name,
        role: "operator",
        locationId,
        mustChangePassword: true,
      },
    });
    const loc = await prisma.location.findUnique({ where: { id: locationId } });
    await logAdminAction({
      action: "operator.create",
      entityType: "operator",
      entityId: user.id,
      summary: `Created operator ${email} bound to ${loc?.name ?? "?"} (${loc?.type ?? "?"})`,
    });
    redirect(`/admin/operators/${user.id}`);
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link href="/admin/operators" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← All operators
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold mt-1">New Operator</h1>
        <p className="text-sm text-zinc-400 mt-1">
          They'll sign in at <code className="text-zinc-300">/admin/login</code>{" "}
          and be redirected to the scanner.
        </p>
      </div>

      <form
        action={create}
        className="bg-[#141414] border border-white/10 rounded-2xl p-6 space-y-4"
      >
        <Field label="Email" required>
          <Input
            type="email"
            name="email"
            required
            autoFocus
            placeholder="site1@soc-afsec.com"
          />
        </Field>
        <Field label="Display Name">
          <Input name="name" placeholder="e.g. Site 1 — Hassan Industries" />
        </Field>
        <Field label="Initial Password" required>
          <Input
            type="text"
            name="password"
            required
            minLength={8}
            placeholder="At least 8 characters"
          />
          <div className="text-xs text-zinc-500 mt-1">
            Tell the operator their password securely. They can sign in and use
            this device long-term.
          </div>
        </Field>
        <Field label="Assigned Location" required>
          <select
            name="locationId"
            defaultValue={preselect}
            required
            className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-[#c9a56a]"
          >
            <option value="">— Select a location —</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.type})
              </option>
            ))}
          </select>
        </Field>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="bg-[#c9a56a] text-black font-semibold px-5 py-2.5 rounded-md hover:bg-[#e0c490] transition"
          >
            Create Operator
          </button>
          <Link href="/admin/operators" className="text-sm text-zinc-400 hover:text-white">
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
