import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { logAdminAction } from "@/lib/audit";

type SearchParams = Promise<{ locationId?: string; error?: string; role?: string }>;

export const dynamic = "force-dynamic";

export default async function NewAccountPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const locations = await prisma.location.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  const preselect = sp.locationId ?? "";
  const defaultRole = sp.role === "manager" ? "manager" : "operator";

  async function create(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").toLowerCase().trim();
    const name = String(formData.get("name") ?? "").trim() || null;
    const password = String(formData.get("password") ?? "");
    const role = String(formData.get("role") ?? "operator");
    const locationId = String(formData.get("locationId") ?? "").trim() || null;

    if (!email || password.length < 8) return;
    if (role !== "operator" && role !== "manager") return;
    // Operators must be bound to a location; managers don't need one.
    if (role === "operator" && !locationId) return;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) redirect(`/admin/operators/new?error=email_taken`);

    const hash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        password: hash,
        name,
        role,
        locationId: role === "operator" ? locationId : null,
        mustChangePassword: true,
      },
    });
    const loc = locationId
      ? await prisma.location.findUnique({ where: { id: locationId } })
      : null;
    await logAdminAction({
      action: role === "manager" ? "operator.create" : "operator.create",
      entityType: "operator",
      entityId: user.id,
      summary:
        role === "manager"
          ? `Created manager ${email}`
          : `Created operator ${email} bound to ${loc?.name ?? "?"} (${loc?.type ?? "?"})`,
    });
    redirect(`/admin/operators/${user.id}`);
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link href="/admin/operators" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← All accounts
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold mt-1">New Account</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Operators scan QRs at a single location and see only validity/expiry.
          Managers can review the full document files for any guard.
        </p>
      </div>

      {sp.error === "email_taken" && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
          That email is already in use.
        </div>
      )}

      <form
        action={create}
        className="bg-[#141414] border border-white/10 rounded-2xl p-6 space-y-4"
      >
        <Field label="Account Type" required>
          <select
            name="role"
            defaultValue={defaultRole}
            className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-[#c9a56a]"
          >
            <option value="operator">Operator — scans QRs, sees status only</option>
            <option value="manager">Manager — reviews full documents</option>
          </select>
        </Field>
        <Field label="Email" required>
          <Input type="email" name="email" required autoFocus placeholder="name@soc-afsec.com" />
        </Field>
        <Field label="Display Name">
          <Input name="name" placeholder="e.g. Site 1 — Hassan Industries / Operations Manager" />
        </Field>
        <Field label="Initial Password" required>
          <Input type="text" name="password" required minLength={8} placeholder="At least 8 characters" />
          <div className="text-xs text-zinc-500 mt-1">
            Share securely. They'll be required to set their own password on
            first sign-in.
          </div>
        </Field>
        <Field label="Assigned Location (operators only)">
          <select
            name="locationId"
            defaultValue={preselect}
            className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-[#c9a56a]"
          >
            <option value="">— None (required for operators) —</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.type})
              </option>
            ))}
          </select>
          <div className="text-xs text-zinc-500 mt-1">
            Managers don't need a location. Operators must have one.
          </div>
        </Field>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="bg-[#c9a56a] text-black font-semibold px-5 py-2.5 rounded-md hover:bg-[#e0c490] transition"
          >
            Create Account
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
