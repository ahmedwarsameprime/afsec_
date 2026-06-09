import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { dateInputValue } from "@/lib/dates";
import { saveUpload, deleteUpload } from "@/lib/storage";
import { revalidatePath } from "next/cache";
import { TrainingEditor } from "./TrainingEditor";
import { logAdminAction, diffFields } from "@/lib/audit";
import { proxiedFileUrl } from "@/lib/file-url";

type Params = Promise<{ id: string }>;

export const dynamic = "force-dynamic";

const IMG_EXT = ["jpg", "jpeg", "png", "webp"];
const DOC_EXT = ["jpg", "jpeg", "png", "webp", "pdf"];

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
function toOptInt(v: FormDataEntryValue | null): number | null {
  const s = toStr(v);
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export default async function EditGuardPage({ params }: { params: Params }) {
  const { id } = await params;
  const guard = await prisma.guard.findUnique({
    where: { id },
    include: { trainings: { orderBy: { createdAt: "desc" } } },
  });
  if (!guard || guard.deletedAt) notFound();

  async function save(formData: FormData) {
    "use server";

    // All upload slots — name -> {prefix, exts}
    const uploads = {
      photo: { prefix: "photo", exts: IMG_EXT, col: "photoUrl" },
      permit1Document: { prefix: "permit1", exts: DOC_EXT, col: "permit1DocumentUrl" },
      permit2Document: { prefix: "permit2", exts: DOC_EXT, col: "permit2DocumentUrl" },
      visaDocument: { prefix: "visa", exts: DOC_EXT, col: "visaDocumentUrl" },
      medicalDocument: { prefix: "medical", exts: DOC_EXT, col: "medicalDocumentUrl" },
    } as const;

    type ColName =
      | "photoUrl"
      | "permit1DocumentUrl"
      | "permit2DocumentUrl"
      | "visaDocumentUrl"
      | "medicalDocumentUrl";

    const newUrls: Partial<Record<ColName, string>> = {};
    for (const [field, cfg] of Object.entries(uploads)) {
      const f = formData.get(field) as File | null;
      if (!f || f.size === 0) continue;
      const url = await saveUpload(f, `${id}-${cfg.prefix}`, [...cfg.exts]);
      if (url) newUrls[cfg.col] = url;
    }

    // Clean up any documents that are being replaced.
    if (Object.keys(newUrls).length > 0) {
      const existing = await prisma.guard.findUnique({
        where: { id },
        select: {
          photoUrl: true,
          permit1DocumentUrl: true,
          permit2DocumentUrl: true,
          visaDocumentUrl: true,
          medicalDocumentUrl: true,
        },
      });
      for (const col of Object.keys(newUrls) as ColName[]) {
        await deleteUpload(existing?.[col]);
      }
    }

    const before = guard!;
    const updated = await prisma.guard.update({
      where: { id },
      data: {
        firstName: toStr(formData.get("firstName")),
        lastName: toStr(formData.get("lastName")),
        jobTitle: toStr(formData.get("jobTitle")),
        employeeId: toOptStr(formData.get("employeeId")),
        status: toStr(formData.get("status")) || "active",

        permit1Number: toOptStr(formData.get("permit1Number")),
        permit1WeaponNumber: toOptStr(formData.get("permit1WeaponNumber")),
        permit1Make: toOptStr(formData.get("permit1Make")),
        permit1Model: toOptStr(formData.get("permit1Model")),
        permit1Clips: toOptInt(formData.get("permit1Clips")),
        permit1IssueDate: toDate(formData.get("permit1IssueDate")),
        permit1ExpiryDate: toDate(formData.get("permit1ExpiryDate")),

        permit2Number: toOptStr(formData.get("permit2Number")),
        permit2WeaponNumber: toOptStr(formData.get("permit2WeaponNumber")),
        permit2Make: toOptStr(formData.get("permit2Make")),
        permit2Model: toOptStr(formData.get("permit2Model")),
        permit2Clips: toOptInt(formData.get("permit2Clips")),
        permit2IssueDate: toDate(formData.get("permit2IssueDate")),
        permit2ExpiryDate: toDate(formData.get("permit2ExpiryDate")),

        visaNumber: toOptStr(formData.get("visaNumber")),
        visaIssueDate: toDate(formData.get("visaIssueDate")),
        visaExpiryDate: toDate(formData.get("visaExpiryDate")),

        medicalClearanceDate: toDate(formData.get("medicalClearanceDate")),
        medicalExpiryDate: toDate(formData.get("medicalExpiryDate")),

        notes: toOptStr(formData.get("notes")),

        ...newUrls,
      },
    });

    const auditFields = [
      "firstName","lastName","jobTitle","employeeId","status",
      "permit1Number","permit1WeaponNumber","permit1Make","permit1Model","permit1Clips","permit1ExpiryDate",
      "permit2Number","permit2WeaponNumber","permit2Make","permit2Model","permit2Clips","permit2ExpiryDate",
      "visaNumber","visaExpiryDate","medicalExpiryDate",
    ] as const;
    const changed = diffFields(
      before as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>,
      [...auditFields] as unknown as (keyof Record<string, unknown>)[]
    );
    const isStatusFlip =
      changed && Object.prototype.hasOwnProperty.call(changed, "status");
    await logAdminAction({
      action: isStatusFlip ? "guard.status_change" : "guard.update",
      entityType: "guard",
      entityId: id,
      summary: isStatusFlip
        ? `Status ${changed!.status![0]} → ${changed!.status![1]} for ${updated.firstName} ${updated.lastName}`
        : `Updated profile of ${updated.firstName} ${updated.lastName}`,
      changes: changed ? (JSON.parse(JSON.stringify(changed)) as Record<string, unknown>) : undefined,
    });

    revalidatePath(`/admin/${id}`);
    revalidatePath("/admin");
    revalidatePath(`/p/${guard!.slug}`);
  }

  async function remove() {
    "use server";
    // Soft delete — restorable from /admin/trash for 30 days.
    const target = await prisma.guard.findUnique({ where: { id } });
    await prisma.guard.update({ where: { id }, data: { deletedAt: new Date() } });
    await logAdminAction({
      action: "guard.delete",
      entityType: "guard",
      entityId: id,
      summary: target
        ? `Soft-deleted ${target.firstName} ${target.lastName} (restorable for 30 days)`
        : `Soft-deleted guard ${id}`,
    });
    redirect("/admin");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
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
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <Link
            href={`/admin/${guard.id}/id-card`}
            className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-md border border-[#c9a56a]/40 text-[#c9a56a] hover:bg-[#c9a56a]/10 transition text-sm font-medium"
          >
            ID Card / QR
          </Link>
          <Link
            href={`/p/${guard.slug}`}
            target="_blank"
            className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-md border border-white/20 text-white hover:bg-white/5 transition text-sm font-medium"
          >
            Public Profile ↗
          </Link>
        </div>
      </div>

      <p className="text-xs text-zinc-500 -mt-2">
        Tip: a permit, visa, training or medical record is shown as{" "}
        <span className="text-emerald-400">Active</span> on the public profile
        when its document is uploaded and not past its expiry date. Permits
        with no data are hidden entirely.
      </p>

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
                    src={proxiedFileUrl(guard.photoUrl) ?? ""}
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
        <PermitSection
          title="Permit 1 — Hand Guns"
          prefix="permit1"
          permitNumber={guard.permit1Number}
          weaponNumber={guard.permit1WeaponNumber}
          make={guard.permit1Make}
          model={guard.permit1Model}
          clips={guard.permit1Clips}
          issueDate={guard.permit1IssueDate}
          expiryDate={guard.permit1ExpiryDate}
          documentUrl={guard.permit1DocumentUrl}
        />

        {/* Permit 2 */}
        <PermitSection
          title="Permit 2 — Rifles"
          prefix="permit2"
          permitNumber={guard.permit2Number}
          weaponNumber={guard.permit2WeaponNumber}
          make={guard.permit2Make}
          model={guard.permit2Model}
          clips={guard.permit2Clips}
          issueDate={guard.permit2IssueDate}
          expiryDate={guard.permit2ExpiryDate}
          documentUrl={guard.permit2DocumentUrl}
        />

        {/* Visa */}
        <Section title="Visa Permit">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="sm:col-span-2">
              <DocumentField
                label="Visa Document"
                name="visaDocument"
                existingUrl={guard.visaDocumentUrl}
              />
            </div>
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
              <DocumentField
                label="Medical Document"
                name="medicalDocument"
                existingUrl={guard.medicalDocumentUrl}
              />
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

        <div className="sticky bottom-2 sm:bottom-4 z-20">
          <button
            type="submit"
            className="w-full sm:w-auto bg-[#c9a56a] text-black font-semibold px-6 py-3 rounded-md hover:bg-[#e0c490] transition shadow-2xl"
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

function PermitSection({
  title,
  prefix,
  permitNumber,
  weaponNumber,
  make,
  model,
  clips,
  issueDate,
  expiryDate,
  documentUrl,
}: {
  title: string;
  prefix: "permit1" | "permit2";
  permitNumber: string | null;
  weaponNumber: string | null;
  make: string | null;
  model: string | null;
  clips: number | null;
  issueDate: Date | null;
  expiryDate: Date | null;
  documentUrl: string | null;
}) {
  return (
    <Section title={title}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Permit Number">
          <Input name={`${prefix}Number`} defaultValue={permitNumber ?? ""} />
        </Field>
        <Field label="Weapon Serial Number">
          <Input
            name={`${prefix}WeaponNumber`}
            defaultValue={weaponNumber ?? ""}
            placeholder="Stamped on the firearm"
          />
        </Field>
        <Field label="Make">
          <Input
            name={`${prefix}Make`}
            defaultValue={make ?? ""}
            placeholder="e.g. Norinco, Glock, Smith & Wesson"
          />
        </Field>
        <Field label="Model">
          <Input
            name={`${prefix}Model`}
            defaultValue={model ?? ""}
            placeholder="e.g. AK-47, G19"
          />
        </Field>
        <Field label="Clips Assigned">
          <Input
            type="number"
            min={0}
            name={`${prefix}Clips`}
            defaultValue={clips ?? ""}
            placeholder="e.g. 7"
          />
        </Field>
        <Field label="Issue Date">
          <Input
            type="date"
            name={`${prefix}IssueDate`}
            defaultValue={dateInputValue(issueDate)}
          />
        </Field>
        <Field label="Expiry Date">
          <Input
            type="date"
            name={`${prefix}ExpiryDate`}
            defaultValue={dateInputValue(expiryDate)}
          />
        </Field>
        <div className="sm:col-span-2">
          <DocumentField
            label="Permit Document"
            name={`${prefix}Document`}
            existingUrl={documentUrl}
          />
        </div>
      </div>
    </Section>
  );
}

function DocumentField({
  label,
  name,
  existingUrl,
}: {
  label: string;
  name: string;
  existingUrl: string | null;
}) {
  return (
    <Field label={`${label} (PDF or image)`}>
      <div className="flex items-center gap-3 flex-wrap">
        {existingUrl && (
          <a
            href={proxiedFileUrl(existingUrl) ?? existingUrl}
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
          name={name}
          accept="image/*,application/pdf"
          className="text-sm text-zinc-400 file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-[#c9a56a] file:text-black file:font-medium file:cursor-pointer hover:file:bg-[#e0c490]"
        />
      </div>
      <div className="text-xs text-zinc-500 mt-1">
        {existingUrl ? "Choose a new file to replace the existing document. " : ""}
        Max 10 MB.
      </div>
    </Field>
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
