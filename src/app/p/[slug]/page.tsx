import { prisma } from "@/lib/prisma";
import { formatDate, isExpired } from "@/lib/dates";
import { StatusBadge } from "@/components/StatusBadge";
import { Logo } from "@/components/Logo";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { ArmoryFlow } from "./ArmoryFlow";

type Params = Promise<{ slug: string }>;

export const dynamic = "force-dynamic";

// "Active" iff there's an expiry in the future, OR a document on file
// with no expiry. Otherwise (no data, expired) → Inactive.
function isActive(args: {
  expiry?: Date | null | undefined;
  documentUrl?: string | null | undefined;
}): boolean {
  const { expiry, documentUrl } = args;
  if (!expiry && !documentUrl) return false;
  if (expiry && isExpired(expiry)) return false;
  return true;
}

const SITE_IN_TYPES = ["site_in", "verification"]; // legacy 'verification' = entry
const SITE_OUT_TYPES = ["site_out"];

export default async function PublicProfile({ params }: { params: Params }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/admin/login?callbackUrl=/p/${slug}`);

  const guard = await prisma.guard.findUnique({
    where: { slug },
    include: { trainings: { orderBy: { issueDate: "desc" } } },
  });

  if (!guard) notFound();

  const role = session.user.role ?? "admin";
  const locationId = session.user.locationId;
  const locationType = session.user.locationType;
  const locationName = session.user.locationName;

  let sitePulse: { kind: "site_in" | "site_out"; when: Date } | null = null;

  // Site operator → alternate Entry / Exit based on the last site scan
  // for (guard, location).
  if (role === "operator" && locationId && locationType === "site") {
    const last = await prisma.scanLog.findFirst({
      where: {
        guardId: guard.id,
        locationId,
        scanType: { in: [...SITE_IN_TYPES, ...SITE_OUT_TYPES] },
      },
      orderBy: { scannedAt: "desc" },
    });

    // If last was site_in (or legacy verification), this scan = site_out.
    // Otherwise (no prior, or last was site_out), this scan = site_in.
    const next: "site_in" | "site_out" =
      last && SITE_IN_TYPES.includes(last.scanType) ? "site_out" : "site_in";

    const h = await headers();
    const created = await prisma.scanLog.create({
      data: {
        guardId: guard.id,
        scannedById: session.user.id,
        locationId,
        scanType: next,
        ipAddress: h.get("x-forwarded-for") ?? null,
        userAgent: h.get("user-agent") ?? null,
      },
    });
    sitePulse = { kind: next, when: created.scannedAt };
  }

  // Armory operator → compute "open" issuances = armory_out for this guard
  // at this armory whose weaponSerial hasn't been matched by a later armory_in.
  type OpenIssuance = {
    scanId: string;
    weaponSerial: string;
    permitContext: "permit1" | "permit2" | null;
    scannedAt: Date;
    make: string | null;
    model: string | null;
  };
  let openIssuances: OpenIssuance[] = [];

  if (role === "operator" && locationId && locationType === "armory") {
    // Get last 50 armory scans for this guard/location, oldest first.
    const armoryScans = await prisma.scanLog.findMany({
      where: {
        guardId: guard.id,
        locationId,
        scanType: { in: ["armory_out", "armory_in"] },
      },
      orderBy: { scannedAt: "asc" },
      take: 100,
    });

    // Walk the list; maintain an open-issuances map keyed by weaponSerial.
    const open = new Map<string, OpenIssuance>();
    for (const s of armoryScans) {
      if (!s.weaponSerial) continue;
      const key = s.weaponSerial.toLowerCase();
      if (s.scanType === "armory_out") {
        open.set(key, {
          scanId: s.id,
          weaponSerial: s.weaponSerial,
          permitContext:
            s.permitContext === "permit1" || s.permitContext === "permit2"
              ? s.permitContext
              : null,
          scannedAt: s.scannedAt,
          make: null,
          model: null,
        });
      } else if (s.scanType === "armory_in") {
        open.delete(key);
      }
    }

    // Enrich with make/model from the guard's permit record.
    openIssuances = [...open.values()].map((o) => {
      if (o.permitContext === "permit1") {
        return { ...o, make: guard.permit1Make, model: guard.permit1Model };
      }
      if (o.permitContext === "permit2") {
        return { ...o, make: guard.permit2Make, model: guard.permit2Model };
      }
      return o;
    });
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
  ];

  // Armory flow only offers permits that have a weapon defined.
  const issuablePermits = permits.filter(
    (p) => p.weapon || p.make || p.model
  );

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
        {sitePulse && (
          <div
            className={`rounded-2xl px-4 py-3 text-sm border ${
              sitePulse.kind === "site_in"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                : "bg-sky-500/10 border-sky-500/30 text-sky-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">
                {sitePulse.kind === "site_in" ? "→" : "←"}
              </span>
              <strong>
                {sitePulse.kind === "site_in" ? "ENTRY logged" : "EXIT logged"}
              </strong>{" "}
              <span className="text-zinc-300">at {locationName}</span>
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              {sitePulse.when.toLocaleString("en-GB", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </div>
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
          <ArmoryFlow
            guardId={guard.id}
            guardName={fullName}
            locationId={locationId}
            permits={issuablePermits.map((p) => ({
              key: p.key,
              label: p.label,
              permitNumber: p.number,
              weaponNumber: p.weapon,
              make: p.make,
              model: p.model,
              clips: p.clips,
              expiryDate: p.expiryDate ? p.expiryDate.toISOString() : null,
            }))}
            openIssuances={openIssuances.map((o) => ({
              scanId: o.scanId,
              weaponSerial: o.weaponSerial,
              permitContext: o.permitContext,
              issuedAt: o.scannedAt.toISOString(),
              make: o.make,
              model: o.model,
            }))}
          />
        )}

        {/* Weapon Permits */}
        <Section title="Weapon Permits">
          {permits.map(({ key: _k, ...rest }) => (
            <PermitRow key={rest.label} {...rest} />
          ))}
        </Section>

        {/* Visa */}
        <Section title="Visa Permit">
          <div className="px-4 py-3 grid grid-cols-2 gap-3 text-sm">
            <Field label="Status">
              <ActiveBadge
                expiry={guard.visaExpiryDate}
                documentUrl={guard.visaDocumentUrl}
              />
            </Field>
            <Field label="Number">
              <span className="font-mono text-zinc-200">
                {guard.visaNumber ?? "—"}
              </span>
            </Field>
            <Field label="Issued">
              <span>{formatDate(guard.visaIssueDate)}</span>
            </Field>
            <Field label="Expires">
              <span
                className={
                  guard.visaExpiryDate && isExpired(guard.visaExpiryDate)
                    ? "text-red-400"
                    : ""
                }
              >
                {formatDate(guard.visaExpiryDate)}
              </span>
            </Field>
            {guard.visaDocumentUrl && (
              <div className="col-span-2">
                <DocLink url={guard.visaDocumentUrl} label="View visa document" />
              </div>
            )}
          </div>
        </Section>

        {/* Medical */}
        <Section title="Medical Clearance">
          <div className="px-4 py-3 grid grid-cols-2 gap-3 text-sm">
            <Field label="Status">
              <ActiveBadge
                expiry={guard.medicalExpiryDate}
                documentUrl={guard.medicalDocumentUrl}
              />
            </Field>
            <Field label="Cleared">
              <span>{formatDate(guard.medicalClearanceDate)}</span>
            </Field>
            <Field label="Expires">
              <span
                className={
                  guard.medicalExpiryDate && isExpired(guard.medicalExpiryDate)
                    ? "text-red-400"
                    : ""
                }
              >
                {formatDate(guard.medicalExpiryDate)}
              </span>
            </Field>
            {guard.medicalDocumentUrl && (
              <div className="col-span-2">
                <DocLink url={guard.medicalDocumentUrl} label="View medical document" />
              </div>
            )}
          </div>
        </Section>

        {/* Training */}
        <Section title={`Training History (${guard.trainings.length})`}>
          {guard.trainings.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-zinc-500">
              No training records on file.
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {guard.trainings.map((t) => (
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
                    <ActiveBadge
                      expiry={t.expiryDate}
                      documentUrl={t.documentUrl}
                    />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-zinc-400">
                    <div>
                      <span className="text-zinc-600">Issued:</span>{" "}
                      {formatDate(t.issueDate)}
                    </div>
                    <div>
                      <span className="text-zinc-600">Expires:</span>{" "}
                      <span
                        className={
                          t.expiryDate && isExpired(t.expiryDate)
                            ? "text-red-400"
                            : ""
                        }
                      >
                        {formatDate(t.expiryDate)}
                      </span>
                    </div>
                  </div>
                  {t.documentUrl && (
                    <div className="mt-2">
                      <DocLink url={t.documentUrl} label="View certificate" />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>

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
        <ActiveBadge expiry={expiryDate} documentUrl={documentUrl} />
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
        <div>
          <span className="text-zinc-600">Permit No.</span>{" "}
          <span className="font-mono text-zinc-200">{number ?? "—"}</span>
        </div>
        <div>
          <span className="text-zinc-600">Issued:</span> {formatDate(issueDate)}
        </div>
        <div>
          <span className="text-zinc-600">Expires:</span>{" "}
          <span
            className={
              expiryDate && isExpired(expiryDate) ? "text-red-400" : ""
            }
          >
            {formatDate(expiryDate)}
          </span>
        </div>
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

function ActiveBadge({
  expiry,
  documentUrl,
}: {
  expiry: Date | null | undefined;
  documentUrl: string | null | undefined;
}) {
  return isActive({ expiry, documentUrl }) ? (
    <StatusBadge status="active" />
  ) : (
    <StatusBadge status="inactive" />
  );
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
