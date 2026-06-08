import { prisma } from "@/lib/prisma";
import { formatDate, expiryStatus, isExpired } from "@/lib/dates";
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

  // Derived statuses
  const permits = [
    {
      label: "Permit 1 — Hand Guns",
      number: guard.permit1Number,
      weapon: guard.permit1WeaponNumber,
      issueDate: guard.permit1IssueDate,
      expiryDate: guard.permit1ExpiryDate,
      documentUrl: guard.permit1DocumentUrl,
    },
    {
      label: "Permit 2 — Rifles",
      number: guard.permit2Number,
      weapon: guard.permit2WeaponNumber,
      issueDate: guard.permit2IssueDate,
      expiryDate: guard.permit2ExpiryDate,
      documentUrl: guard.permit2DocumentUrl,
    },
  ].filter(
    (p) =>
      p.number || p.weapon || p.issueDate || p.expiryDate || p.documentUrl
  );

  const visaPresent =
    guard.visaNumber ||
    guard.visaIssueDate ||
    guard.visaExpiryDate ||
    guard.visaDocumentUrl;

  const medicalPresent =
    guard.medicalClearanceDate ||
    guard.medicalExpiryDate ||
    guard.medicalDocumentUrl;

  // Only show training records that have a document AND aren't soft-deleted.
  // Show all if you want, but filtering by document keeps the profile honest.
  const trainings = guard.trainings;

  return (
    <main className="min-h-screen w-full bg-[#0a0a0a] text-white">
      {/* Top banner */}
      <div className="bg-black/60 border-b border-[#c9a56a]/20 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Logo size={26} />
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

        {/* Weapon Permits — only sections with data */}
        {permits.length > 0 && (
          <Section title="Weapon Permits">
            {permits.map((p) => (
              <PermitRow key={p.label} {...p} />
            ))}
          </Section>
        )}

        {/* Visa */}
        {visaPresent && (
          <Section title="Visa Permit">
            <div className="px-4 py-3 grid grid-cols-2 gap-3 text-sm">
              <Field label="Status">
                <DerivedStatus
                  documentUrl={guard.visaDocumentUrl}
                  expiry={guard.visaExpiryDate}
                />
              </Field>
              {guard.visaNumber && (
                <Field label="Number">
                  <span className="font-mono text-zinc-200">{guard.visaNumber}</span>
                </Field>
              )}
              {guard.visaIssueDate && (
                <Field label="Issued">
                  <span>{formatDate(guard.visaIssueDate)}</span>
                </Field>
              )}
              {guard.visaExpiryDate && (
                <Field label="Expires">
                  <DateWithBadge date={guard.visaExpiryDate} />
                </Field>
              )}
              {guard.visaDocumentUrl && (
                <div className="col-span-2">
                  <DocLink url={guard.visaDocumentUrl} label="View visa document" />
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Medical */}
        {medicalPresent && (
          <Section title="Medical Clearance">
            <div className="px-4 py-3 grid grid-cols-2 gap-3 text-sm">
              <Field label="Status">
                <DerivedStatus
                  documentUrl={guard.medicalDocumentUrl}
                  expiry={guard.medicalExpiryDate}
                />
              </Field>
              {guard.medicalClearanceDate && (
                <Field label="Cleared">
                  <span>{formatDate(guard.medicalClearanceDate)}</span>
                </Field>
              )}
              {guard.medicalExpiryDate && (
                <Field label="Expires">
                  <DateWithBadge date={guard.medicalExpiryDate} />
                </Field>
              )}
              {guard.medicalDocumentUrl && (
                <div className="col-span-2">
                  <DocLink url={guard.medicalDocumentUrl} label="View medical document" />
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Training history */}
        {trainings.length > 0 && (
          <Section title={`Training History (${trainings.length})`}>
            <ul className="divide-y divide-white/5">
              {trainings.map((t) => (
                <li key={t.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
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
                    <DerivedStatus
                      documentUrl={t.documentUrl}
                      expiry={t.expiryDate}
                    />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-zinc-400">
                    {t.issueDate && (
                      <div>
                        <span className="text-zinc-600">Issued:</span>{" "}
                        {formatDate(t.issueDate)}
                      </div>
                    )}
                    {t.expiryDate && (
                      <div>
                        <span className="text-zinc-600">Expires:</span>{" "}
                        {formatDate(t.expiryDate)}
                      </div>
                    )}
                  </div>
                  {t.documentUrl && (
                    <div className="mt-2">
                      <DocLink url={t.documentUrl} label="View certificate" />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

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

function PermitRow({
  label,
  number,
  weapon,
  issueDate,
  expiryDate,
  documentUrl,
}: {
  label: string;
  number: string | null;
  weapon: string | null;
  issueDate: Date | null;
  expiryDate: Date | null;
  documentUrl: string | null;
}) {
  return (
    <div className="px-4 py-3 border-b border-white/5 last:border-0">
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <div className="font-medium text-zinc-100">{label}</div>
        <DerivedStatus documentUrl={documentUrl} expiry={expiryDate} />
      </div>
      <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs text-zinc-400">
        {number && (
          <div>
            <span className="text-zinc-600">Permit No.</span>{" "}
            <span className="font-mono text-zinc-200">{number}</span>
          </div>
        )}
        {weapon && (
          <div>
            <span className="text-zinc-600">Weapon No.</span>{" "}
            <span className="font-mono text-zinc-200">{weapon}</span>
          </div>
        )}
        {issueDate && (
          <div>
            <span className="text-zinc-600">Issued:</span> {formatDate(issueDate)}
          </div>
        )}
        {expiryDate && (
          <div>
            <span className="text-zinc-600">Expires:</span> {formatDate(expiryDate)}
          </div>
        )}
      </div>
      {documentUrl && (
        <div className="mt-2">
          <DocLink url={documentUrl} label="View permit document" />
        </div>
      )}
    </div>
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

// Active when a document is on file AND it hasn't expired (if an expiry was given).
function DerivedStatus({
  documentUrl,
  expiry,
}: {
  documentUrl: string | null;
  expiry: Date | null;
}) {
  if (!documentUrl) {
    return <StatusBadge status="none" label="Document missing" />;
  }
  if (expiry && isExpired(expiry)) {
    return <StatusBadge status="expired" />;
  }
  if (expiry) {
    const s = expiryStatus(expiry);
    if (s === "soon") return <StatusBadge status="soon" />;
  }
  return <StatusBadge status="active" />;
}

function DocLink({ url, label }: { url: string; label: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#c9a56a]/10 border border-[#c9a56a]/40 text-[#c9a56a] text-xs font-medium hover:bg-[#c9a56a]/20"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      {label}
    </a>
  );
}
