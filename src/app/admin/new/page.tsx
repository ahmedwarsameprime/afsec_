import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/slug";
import { logAdminAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

export default function NewGuardPage() {
  async function create(formData: FormData) {
    "use server";
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const jobTitle = String(formData.get("jobTitle") ?? "").trim();
    const employeeId = String(formData.get("employeeId") ?? "").trim();

    if (!firstName || !lastName || !jobTitle) {
      // Required fields missing — Next will re-render the page.
      return;
    }

    const guard = await prisma.guard.create({
      data: {
        slug: generateSlug(),
        firstName,
        lastName,
        jobTitle,
        employeeId: employeeId || null,
      },
    });
    await logAdminAction({
      action: "guard.create",
      entityType: "guard",
      entityId: guard.id,
      summary: `Created ${firstName} ${lastName} — ${jobTitle}`,
    });
    redirect(`/admin/${guard.id}`);
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <Link href="/admin" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← All guards
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold mt-1">Add New Guard</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Enter the basics now. You can upload a photo, add permits, visa,
          medical clearance and training history on the next screen.
        </p>
      </div>

      <form
        action={create}
        className="bg-[#141414] border border-white/10 rounded-2xl p-6 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="First Name" required>
            <Input name="firstName" required autoFocus />
          </Field>
          <Field label="Last Name" required>
            <Input name="lastName" required />
          </Field>
        </div>
        <Field label="Job Title" required>
          <Input
            name="jobTitle"
            required
            placeholder="e.g. Mobile Security Officer"
          />
        </Field>
        <Field label="Employee ID">
          <Input name="employeeId" placeholder="e.g. SOC-001" />
        </Field>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="bg-[#c9a56a] text-black font-semibold px-5 py-2.5 rounded-md hover:bg-[#e0c490] transition"
          >
            Create Guard Profile
          </button>
          <Link
            href="/admin"
            className="text-sm text-zinc-400 hover:text-white"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
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
      className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-[#c9a56a] focus:ring-1 focus:ring-[#c9a56a]/40"
    />
  );
}
