import { prisma } from "@/lib/prisma";
import { formatDate, expiryStatus } from "@/lib/dates";
import { StatusBadge } from "@/components/StatusBadge";
import { Logo } from "@/components/Logo";
import { notFound } from "next/navigation";

type Params = Promise<{ slug: string }>;

export const dynamic = "force-dynamic";

export default async function PublicProfile({ params }: { params: Params }) {
  const { slug } = await params;
  const guard = await prisma.guard.findUnique({
    where: { slug },
    include: { trainings: { orderBy: { issueDate: "desc" } } },
  });

  if (!guard) notFound();

  const fullName = `${guard.firstName} ${guard.lastName}`;

  return (
    <main className="min-h-screen w-full bg-[#0a0a0a] text-white">
      {/* Top banner */}
      <div className="bg-black/60 border-b border-[#c9a56a]/20 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Logo size={28} />
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">
            Verified Credential
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header card */}
        <div className="bg-gradient-to-br from-[#1c1c1c] to-[#141414] rounded-2xl border border-[#c9a56a]/20 overflow-hidden">
          <div className="h-16 bg-gradient-to-r from-[#c9a56a]/30 via-[#c9a56a]/10 to-transparent" />
          <div className="px-6 pb-6 -mt-12">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="w-28 h-28 rounded-2xl border-4 border-[#0a0a0a] bg-zinc-800 overflow-hidden shadow-xl flex items-center justify-center text-zinc-600">
                {guard.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={guard.photoUrl}
                    alt={fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-2xl font-bold leading-tight">{fullName}</div>
                <div className="text-[#c9a56a] font-medium">{guard.jobTitle}</div>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <StatusBadge status={guard.status} />
                  {guard.employeeId && (
                    <span className="text-xs text-zinc-500 font-mono">
                      ID: {guard.employeeId}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Permits */}
        <Section title="Weapon Permits">
          <PermitRow
            label="Permit 1 — Hand Guns"
            active={guard.permit1Active}
            number={guard.permit1Number}
            issueDate={guard.permit1IssueDate}
            expiryDate={guard.permit1ExpiryDate}
          />
          <PermitRow
            label="Permit 2 — Rifles"
            active={guard.permit2Active}
            number={guard.permit2Number}
            issueDate={guard.permit2IssueDate}
            expiryDate={guard.permit2ExpiryDate}
          />
        </Section>

        {/* Visa */}
        <Section title="Visa Permit">
          <div className="px-4 py-3 grid grid-cols-2 gap-3 text-sm">
            <Field label="Status">
              <StatusBadge status={guard.visaStatus === "active" ? "active" : "inactive"} />
            </Field>
            <Field label="Number">
              <span className="font-mono text-zinc-200">{guard.visaNumber ?? "—"}</span>
            </Field>
            <Field label="Issued">
              <span>{formatDate(guard.visaIssueDate)}</span>
            </Field>
            <Field label="Expires">
              <DateWithBadge date={guard.visaExpiryDate} />
            </Field>
          </div>
        </Section>

        {/* Medical */}
        <Section title="Medical Clearance">
          <div className="px-4 py-3 grid grid-cols-2 gap-3 text-sm">
            <Field label="Cleared">
              <span>{formatDate(guard.medicalClearanceDate)}</span>
            </Field>
            <Field label="Expires">
              <DateWithBadge date={guard.medicalExpiryDate} />
            </Field>
          </div>
        </Section>

        {/* Training history */}
        <Section title={`Training History (${guard.trainings.length})`}>
          {guard.trainings.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-zinc-500">
              No training records on file.
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {guard.trainings.map((t) => {
                const status = !t.active
                  ? "inactive"
                  : expiryStatus(t.expiryDate);
                return (
                  <li key={t.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-zinc-100 truncate">
                          {t.name}
                        </div>
                        {t.issuer && (
                          <div className="text-xs text-zinc-500 truncate">
                            {t.issuer}
                          </div>
                        )}
                      </div>
                      <StatusBadge status={status} />
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-zinc-400">
                      <div>
                        <span className="text-zinc-600">Issued:</span>{" "}
                        {formatDate(t.issueDate)}
                      </div>
                      <div>
                        <span className="text-zinc-600">Expires:</span>{" "}
                        {formatDate(t.expiryDate)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        {/* Footer */}
        <div className="text-center text-xs text-zinc-600 pt-4 pb-8">
          <div>
            Verified by <span className="text-[#c9a56a]">SOC-AFSEC Industries</span>
          </div>
          <div className="mt-1">
            Marina Hub, Airport Zone · Mogadishu · Somalia · +252 61 5 594 141
          </div>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-[#141414] rounded-2xl border border-white/5 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-wider text-[#c9a56a] font-semibold">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5">
        {label}
      </div>
      <div className="text-sm text-zinc-100">{children}</div>
    </div>
  );
}

function DateWithBadge({ date }: { date: Date | null | undefined }) {
  const status = expiryStatus(date);
  return (
    <span className="inline-flex items-center gap-2">
      {formatDate(date)}
      {status !== "none" && status !== "ok" && <StatusBadge status={status} />}
    </span>
  );
}

function PermitRow({
  label,
  active,
  number,
  issueDate,
  expiryDate,
}: {
  label: string;
  active: boolean;
  number: string | null;
  issueDate: Date | null;
  expiryDate: Date | null;
}) {
  const status = !active ? "inactive" : expiryStatus(expiryDate);
  return (
    <div className="px-4 py-3 border-b border-white/5 last:border-0">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="font-medium text-zinc-100">{label}</div>
        <StatusBadge status={status} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs text-zinc-400">
        <div>
          <span className="text-zinc-600">No.</span>{" "}
          <span className="font-mono text-zinc-200">{number ?? "—"}</span>
        </div>
        <div>
          <span className="text-zinc-600">Issued:</span> {formatDate(issueDate)}
        </div>
        <div>
          <span className="text-zinc-600">Expires:</span> {formatDate(expiryDate)}
        </div>
      </div>
    </div>
  );
}
