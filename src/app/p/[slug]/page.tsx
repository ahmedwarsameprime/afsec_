import { prisma } from "@/lib/prisma";
import { formatDate, expiryStatus, isExpired } from "@/lib/dates";
import { StatusBadge } from "@/components/StatusBadge";
import { Logo } from "@/components/Logo";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { ArmoryIssuance } from "./ArmoryIssuance";

type Params = Promise<{ slug: string }>;

export const dynamic = "force-dynamic";

export default async function PublicProfile({ params }: { params: Params }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/admin/login?callbackUrl=/p/${slug}`);

  const guard = await prisma.guard.findUnique({
    where: { slug },
    include: { trainings: { orderBy: { issueDate: "desc" } } },
  });

  if (!guard) notFound();

  // Operators log every scan against their assigned location.
  // Armory operators get a confirmation workflow before the log is written.
  const role = session.user.role ?? "admin";
  const locationId = session.user.locationId;
  const locationType = session.user.locationType;
  const locationName = session.user.locationName;

  let scanLogged = false;
  let mostRecentArmoryScan: { weaponSerial: string | null; permitContext: string | null } | null = null;

  if (role === "operator" && locationId && locationType === "site") {
    // For site operators, log the verification scan automatically on view.
    const h = await headers();
    await prisma.scanLog.create({
      data: {
        guardId: guard.id,
        scannedById: session.user.id,
        locationId,
        scanType: "verification",
        ipAddress: h.get("x-forwarded-for") ?? null,
        userAgent: h.get("user-agent") ?? null,
      },
    });
    scanLogged = true;
  }

  if (role === "operator" && locationId && locationType === "armory") {
    // Check whether a recent armory issuance already exists for this guard
    // (within last 12 hours) — useful context for the operator.
    const recent = await prisma.scanLog.findFirst({
      where: {
        guardId: guard.id,
        locationId,
        scanType: "armory_out",
        scannedAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
      },
      orderBy: { scannedAt: "desc" },
    });
    if (recent) {
      mostRecentArmoryScan = {
        weaponSerial: recent.weaponSerial,
        permitContext: recent.permitContext,
      };
    }
  }

  const fullName = `${guard.firstName} ${guard.lastName}`;

  const permits = [
    {
      key: "permit1" as const,
      label: "Permit 1 — Hand Guns",
      number: guard.permit1Number,
      weapon: guard.permit1WeaponNumber,
      make: guard.permit1Make,
      model: guard.permit1Model,
      clips: guard.permit1Clips,
      issueDate: guard.permit1IssueDate,
      expiryDate: guard.permit1ExpiryDate,
      documentUrl: guard.permit1DocumentUrl,
    },
    {
      key: "permit2" as const,
      label: "Permit 2 — Rifles",
      number: guard.permit2Number,
      weapon: guard.permit2WeaponNumber,
      make: guard.permit2Make,
      model: guard.permit2Model,
      clips: guard.permit2Clips,
      issueDate: guard.permit2IssueDate,
      expiryDate: guard.permit2ExpiryDate,
      documentUrl: guard.permit2DocumentUrl,
    },
  ].filter(
    (p) =>
      p.number ||
      p.weapon ||
      p.make ||
      p.model ||
      p.clips !== null ||
      p.issueDate ||
      p.expiryDate ||
      p.documentUrl
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

  const trainings = guard.trainings;

  return (
    <main className="min-h-screen w-full bg-[#0a0a0a] text-white">
      <div className="bg-black/60 border-b border-[#c9a56a]/20 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Logo size={26} />
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
            {role === "operator" && locationName ? (
              <span className="text-zinc-400">
                <span className="text-zinc-600">@</span>{" "}
                <span className="text-[#c9a56a]">{locationName}</span>
              </span>
            ) : (
              <span className="text-zinc-500">Verified Credential</span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {scanLogged && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-4 py-3 text-sm text-emerald-300">
            ✓ Check-in logged at <strong>{locationName}</strong>.
          </div>
        )}

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

        {/* Armory workflow — only for armory operators */}
        {role === "operator" && locationType === "armory" && locationId && (
          <ArmoryIssuance
            guardId={guard.id}
            guardName={fullName}
            locationId={locationId}
            permits={permits.map((p) => ({
              key: p.key,
              label: p.label,
              permitNumber: p.number,
              weaponNumber: p.weapon,
              make: p.make,
              model: p.model,
              clips: p.clips,
              expiryDate: p.expiryDate ? p.expiryDate.toISOString() : null,
            }))}
            recentArmoryScan={mostRecentArmoryScan}
          />
        )}

        {/* Weapon Permits — only sections with data */}
        {permits.length > 0 && (
          <Section title="Weapon Permits">
            {permits.map(({ key: _k, ...rest }) => (
              <PermitRow key={rest.label} {...rest} />
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

        {/* Training */}
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
  make,
  model,
  clips,
  issueDate,
  expiryDate,
  documentUrl,
}: {
  label: string;
  number: string | null;
  weapon: string | null;
  make: string | null;
  model: string | null;
  clips: number | null;
  issueDate: Date | null;
  expiryDate: Date | null;
  documentUrl: string | null;
}) {
  const hasWeapon = make || model || weapon || clips !== null;
  return (
    <div className="px-4 py-3 border-b border-white/5 last:border-0">
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <div className="font-medium text-zinc-100">{label}</div>
        <DerivedStatus documentUrl={documentUrl} expiry={expiryDate} />
      </div>

      {hasWeapon && (
        <div className="bg-black/30 rounded-md px-3 py-2 mb-2 grid grid-cols-2 gap-y-1.5 gap-x-3 text-xs text-zinc-400">
          {(make || model) && (
            <div className="col-span-2">
              <span className="text-zinc-600">Weapon:</span>{" "}
              <span className="text-zinc-100 font-medium">
                {[make, model].filter(Boolean).join(" ")}
              </span>
            </div>
          )}
          {weapon && (
            <div>
              <span className="text-zinc-600">Serial:</span>{" "}
              <span className="font-mono text-zinc-200">{weapon}</span>
            </div>
          )}
          {clips !== null && (
            <div>
              <span className="text-zinc-600">Clips:</span>{" "}
              <span className="text-zinc-100 font-medium">{clips}</span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs text-zinc-400">
        {number && (
          <div>
            <span className="text-zinc-600">Permit No.</span>{" "}
            <span className="font-mono text-zinc-200">{number}</span>
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

function DerivedStatus({
  documentUrl,
  expiry,
}: {
  documentUrl: string | null;
  expiry: Date | null;
}) {
  if (!documentUrl && !expiry) {
    return <StatusBadge status="none" label="Not set" />;
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
