import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/Logo";
import { QRScanner } from "./QRScanner";

export const dynamic = "force-dynamic";

export default async function ScanLandingPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login?callbackUrl=/scan");

  // Admins don't belong here.
  if (session.user.role !== "operator") {
    redirect("/admin");
  }

  const recent = await prisma.scanLog.findMany({
    where: { scannedById: session.user.id },
    orderBy: { scannedAt: "desc" },
    take: 10,
    include: {
      guard: { select: { firstName: true, lastName: true, employeeId: true } },
    },
  });

  const locType = session.user.locationType;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Logo size={28} />
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin/login" });
            }}
          >
            <button
              type="submit"
              aria-label="Sign out"
              className="text-xs text-zinc-400 hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-zinc-500">
            Signed in as
          </div>
          <div className="text-lg font-semibold">
            {session.user.name ?? session.user.email}
          </div>
          {session.user.locationName ? (
            <div className="text-sm mt-1">
              <span className="text-zinc-500">Station:</span>{" "}
              <span className="text-[#c9a56a]">
                {session.user.locationName}
              </span>{" "}
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 ml-1">
                {locType}
              </span>
            </div>
          ) : (
            <div className="mt-2 text-sm text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2">
              ⚠ You haven't been assigned a location yet. Ask an admin to set
              one for your account.
            </div>
          )}
        </div>

        <div>
          <QRScanner />
          <p className="text-xs text-zinc-500 mt-3 text-center">
            {locType === "armory"
              ? "You'll be prompted to confirm the weapon serial before issuance is recorded."
              : "Your scan is logged automatically at your location."}
          </p>
        </div>

        <section className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <h3 className="text-xs uppercase tracking-wider text-[#c9a56a] font-semibold">
              Your recent scans
            </h3>
          </div>
          {recent.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-500">
              No scans yet.
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {recent.map((s) => (
                <li key={s.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <div className="text-sm text-white">
                        {s.guard.firstName} {s.guard.lastName}
                      </div>
                      <div className="text-xs text-zinc-500 font-mono">
                        {s.guard.employeeId ?? "—"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-zinc-400">
                        {s.scannedAt.toLocaleString("en-GB", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                        {scanLabel(s.scanType, s.weaponSerial)}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="text-center text-xs text-zinc-600">
          Tip: prefer Chrome or Safari for the smoothest camera support.
        </div>
      </div>
    </main>
  );
}

function scanLabel(type: string, weaponSerial: string | null): string {
  switch (type) {
    case "site_in":
      return "Entry";
    case "site_out":
      return "Exit";
    case "entry_denied":
      return "⛔ Entry denied";
    case "verification":
      return "Verification";
    case "armory_out":
      return weaponSerial ? `Weapon out — ${weaponSerial}` : "Weapon out";
    case "armory_in":
      return weaponSerial ? `Weapon in — ${weaponSerial}` : "Weapon in";
    case "armory_denied":
      return weaponSerial ? `⛔ Denied — ${weaponSerial}` : "⛔ Issuance denied";
    default:
      return type;
  }
}
