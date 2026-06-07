import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { dateInputValue } from "@/lib/dates";
import { saveUpload, deleteUpload } from "@/lib/storage";
import { revalidatePath } from "next/cache";
import { TrainingEditor } from "./TrainingEditor";

type Params = Promise<{ id: string }>;

export const dynamic = "force-dynamic";

function toDate(v: FormDataEntryValue | null): Date | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function toStr(v: FormDataEntryValue | null): string {
  return String(v ?? "").trim();
}
function toOptStr(v: FormDataEntryValue | null): string | null {
  const s = toStr(v);
  return s.length ? s : null;
}

export default async function EditGuardPage({ params }: { params: Params }) {
  const { id } = await params;
  const guard = await prisma.guard.findUnique({
    where: { id },
    include: { trainings: { orderBy: { createdAt: "desc" } } },
  });
  if (!guard) notFound();

  async function save(formData: FormData) {
    "use server";

    const photo = formData.get("photo") as File | null;
    const medical = formData.get("medicalDocument") as File | null;

    const photoUrl = photo
      ? await saveUpload(photo, `${id}-photo`, ["jpg", "jpeg", "png", "webp"])
      : undefined;
    const medicalDocumentUrl = medical
      ? await saveUpload(medical, `${id}-medical`, [
          "jpg", "jpeg", "png", "webp", "pdf",
        ])
      : undefined;

    if (photoUrl || medicalDocumentUrl) {
      const existing = await prisma.guard.findUnique({
        where: { id },
        select: { photoUrl: true, medicalDocumentUrl: true },
      });
      if (photoUrl) await deleteUpload(existing?.photoUrl);
      if (medicalDocumentUrl) await deleteUpload(existing?.medicalDocumentUrl);
    }

    await prisma.guard.update({
      where: { id },
      data: {
        firstName: toStr(formData.get("firstName")),
        lastName: toStr(formData.get("lastName")),
        jobTitle: toStr(formData.get("jobTitle")),
        employeeId: toOptStr(formData.get("employeeId")),
        status: toStr(formData.get("status")) || "active",
        ...(photoUrl ? { photoUrl } : {}),

        permit1Active: formData.get("permit1Active") === "on",
        permit1Number: toOptStr(formData.get("permit1Number")),
        permit1IssueDate: toDate(formData.get("permit1IssueDate")),
        permit1ExpiryDate: toDate(formData.get("permit1ExpiryDate")),

        permit2Active: formData.get("permit2Active") === "on",
        permit2Number: toOptStr(formData.get("permit2Number")),
        permit2IssueDate: toDate(formData.get("permit2IssueDate")),
        permit2ExpiryDate: toDate(formData.get("permit2ExpiryDate")),

        visaStatus: toStr(formData.get("visaStatus")) || "inactive",
        visaNumber: toOptStr(formData.get("visaNumber")),
        visaIssueDate: toDate(formData.get("visaIssueDate")),
        visaExpiryDate: toDate(formData.get("visaExpiryDate")),

        medicalClearanceDate: toDate(formData.get("medicalClearanceDate")),
        medicalExpiryDate: toDate(formData.get("medicalExpiryDate")),
        ...(medicalDocumentUrl ? { medicalDocumentUrl } : {}),

        notes: toOptStr(formData.get("notes")),
      },
    });

    revalidatePath(`/admin/${id}`);
    revalidatePath("/admin");
    revalidatePath(`/p/${guard!.slug}`);
  }

  async function remove() {
    "use server";
    const g = await prisma.guard.findUnique({
      where: { id },
      select: { photoUrl: true, medicalDocumentUrl: true },
    });
    await deleteUpload(g?.photoUrl);
    await deleteUpload(g?.medicalDocumentUrl);
    await prisma.guard.delete({ where: { id } });
    redirect("/admin");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/admin"
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            ← All guards
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1">
            {guard.firstName} {guard.lastName}
          </h1>
          <div className="text-sm text-zinc-400">{guard.jobTitle}</div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/${guard.id}/id-card`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[#c9a56a]/40 text-[#c9a56a] hover:bg-[#c9a56a]/10 transition text-sm font-medium"
          >
            View ID Card / QR
          </Link>
          <Link
            href={`/p/${guard.slug}`}
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-white/20 text-white hover:bg-white/5 transition text-sm font-medium"
          >
            View Public Profile ↗
          </Link>
        </div>
      </div>

      <form action={save} className="space-y-6">
        {/* Identity */}
        <Section title="Identity">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="First Name" required>
              <Input name="firstName" defaultValue={guard.firstName} required />
            </Field>
            <Field label="Last Name" required>
              <Input name="lastName" defaultValue={guard.lastName} required />
            </Field>
            <Field label="Job Title" required>
              <Input name="jobTitle" defaultValue={guard.jobTitle} required />
            </Field>
            <Field label="Employee ID">
              <Input
                name="employeeId"
                defaultValue={guard.employeeId ?? ""}
                placeholder="e.g. SOC-001"
              />
            </Field>
            <Field label="Status">
              <Select name="status" defaultValue={guard.status}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </Field>
            <Field label="Photo">
              <div className="flex items-center gap-3">
                {guard.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={guard.photoUrl}
                    alt=""
                    className="w-12 h-12 rounded-md object-cover border border-white/10"
                  />
                )}
                <input
                  type="file"
                  name="photo"
                  accept="image/*"
                  className="text-sm text-zinc-400 file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-[#c9a56a] file:text-black file:font-medium file:cursor-pointer hover:file:bg-[#e0c490]"
                />
              </div>
            </Field>
          </div>
        </Section>

        {/* Permit 1 */}
        <Section title="Permit 1 — Hand Guns">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Active">
              <Checkbox name="permit1Active" defaultChecked={guard.permit1Active} />
            </Field>
            <Field label="Permit Number">
              <Input
                name="permit1Number"
                defaultValue={guard.permit1Number ?? ""}
              />
            </Field>
            <Field label="Issue Date">
              <Input
                type="date"
                name="permit1IssueDate"
                defaultValue={dateInputValue(guard.permit1IssueDate)}
              />
            </Field>
            <Field label="Expiry Date">
              <Input
                type="date"
                name="permit1ExpiryDate"
                defaultValue={dateInputValue(guard.permit1ExpiryDate)}
              />
            </Field>
          </div>
        </Section>

        {/* Permit 2 */}
        <Section title="Permit 2 — Rifles">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Active">
              <Checkbox name="permit2Active" defaultChecked={guard.permit2Active} />
            </Field>
            <Field label="Permit Number">
              <Input
                name="permit2Number"
                defaultValue={guard.permit2Number ?? ""}
              />
            </Field>
            <Field label="Issue Date">
              <Input
                type="date"
                name="permit2IssueDate"
                defaultValue={dateInputValue(guard.permit2IssueDate)}
              />
            </Field>
            <Field label="Expiry Date">
              <Input
                type="date"
                name="permit2ExpiryDate"
                defaultValue={dateInputValue(guard.permit2ExpiryDate)}
              />
            </Field>
          </div>
        </Section>

        {/* Visa */}
        <Section title="Visa Permit">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Status">
              <Select name="visaStatus" defaultValue={guard.visaStatus}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </Field>
            <Field label="Visa Number">
              <Input name="visaNumber" defaultValue={guard.visaNumber ?? ""} />
            </Field>
            <Field label="Issue Date">
              <Input
                type="date"
                name="visaIssueDate"
                defaultValue={dateInputValue(guard.visaIssueDate)}
              />
            </Field>
            <Field label="Expiry Date">
              <Input
                type="date"
                name="visaExpiryDate"
                defaultValue={dateInputValue(guard.visaExpiryDate)}
              />
            </Field>
          </div>
        </Section>

        {/* Medical */}
        <Section title="Medical Clearance">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Clearance Date">
              <Input
                type="date"
                name="medicalClearanceDate"
                defaultValue={dateInputValue(guard.medicalClearanceDate)}
              />
            </Field>
            <Field label="Expiry Date">
              <Input
                type="date"
                name="medicalExpiryDate"
                defaultValue={dateInputValue(guard.medicalExpiryDate)}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Medical Document (PDF or image)">
                <div className="flex items-center gap-3 flex-wrap">
                  {guard.medicalDocumentUrl && (
                    <a
                      href={guard.medicalDocumentUrl}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#c9a56a]/10 border border-[#c9a56a]/40 text-[#c9a56a] text-sm hover:bg-[#c9a56a]/20"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      Current document
                    </a>
                  )}
                  <input
                    type="file"
                    name="medicalDocument"
                    accept="image/*,application/pdf"
                    className="text-sm text-zinc-400 file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-[#c9a56a] file:text-black file:font-medium file:cursor-pointer hover:file:bg-[#e0c490]"
                  />
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  Replaces the existing document. Max 10 MB.
                </div>
              </Field>
            </div>
          </div>
        </Section>

        <Section title="Notes">
          <textarea
            name="notes"
            defaultValue={guard.notes ?? ""}
            rows={4}
            className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-[#c9a56a] focus:ring-1 focus:ring-[#c9a56a]/40"
            placeholder="Internal notes (not shown on public profile)…"
          />
        </Section>

        <div className="flex items-center justify-between gap-4 sticky bottom-4 z-20">
          <button
            type="submit"
            className="bg-[#c9a56a] text-black font-semibold px-6 py-2.5 rounded-md hover:bg-[#e0c490] transition shadow-lg"
          >
            Save Changes
          </button>
        </div>
      </form>

      {/* Training history (separate form) */}
      <TrainingEditor guardId={guard.id} trainings={guard.trainings} />

      {/* Danger zone */}
      <Section title="Danger Zone" tone="danger">
        <form action={remove}>
          <button
            type="submit"
            className="text-sm font-medium px-4 py-2 rounded-md border border-red-500/40 text-red-300 hover:bg-red-500/10 transition"
          >
            Delete this guard
          </button>
          <p className="text-xs text-zinc-500 mt-2">
            This permanently removes the profile, training history, and
            invalidates the QR code.
          </p>
        </form>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
  tone,
}: {
  title: string;
  children: React.ReactNode;
  tone?: "danger";
}) {
  return (
    <section
      className={`bg-[#141414] rounded-2xl border overflow-hidden ${
        tone === "danger" ? "border-red-500/30" : "border-white/10"
      }`}
    >
      <div className="px-4 py-3 border-b border-white/5">
        <h2
          className={`text-xs uppercase tracking-wider font-semibold ${
            tone === "danger" ? "text-red-300" : "text-[#c9a56a]"
          }`}
        >
          {title}
        </h2>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
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

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-[#c9a56a] focus:ring-1 focus:ring-[#c9a56a]/40"
    />
  );
}

function Checkbox({
  name,
  defaultChecked,
}: {
  name: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="w-5 h-5 accent-[#c9a56a] bg-[#0a0a0a] border-white/20 rounded"
      />
      <span className="text-sm text-zinc-300">Active</span>
    </label>
  );
}
