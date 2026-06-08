"use client";

import { useState, useTransition } from "react";
import { logArmoryIssuance } from "./armory-actions";

type ResultKind = "approved" | "mismatch" | "no-serial" | "missing-input" | "error";

type Result = {
  kind: ResultKind;
  title: string;
  detail: string;
};

type Permit = {
  key: "permit1" | "permit2";
  label: string;
  permitNumber: string | null;
  weaponNumber: string | null;
  expiryDate: string | null;
};

export function ArmoryIssuance({
  guardId,
  guardName,
  locationId,
  permits,
  recentArmoryScan,
}: {
  guardId: string;
  guardName: string;
  locationId: string;
  permits: Permit[];
  recentArmoryScan: { weaponSerial: string | null; permitContext: string | null } | null;
}) {
  const [selectedKey, setSelectedKey] = useState<string>(permits[0]?.key ?? "");
  const [serial, setSerial] = useState("");
  const [busy, startTransition] = useTransition();
  const [result, setResult] = useState<Result | null>(null);

  const selected = permits.find((p) => p.key === selectedKey);
  const expected = selected?.weaponNumber ?? "";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    if (!selected) {
      setResult({
        kind: "missing-input",
        title: "Cannot proceed",
        detail: "Select which permit you're issuing against first.",
      });
      return;
    }
    const entered = serial.trim();
    if (!entered) {
      setResult({
        kind: "missing-input",
        title: "Serial required",
        detail:
          "Enter the weapon serial number stamped on the firearm before submitting.",
      });
      return;
    }
    if (!expected) {
      setResult({
        kind: "no-serial",
        title: "Cannot verify — no serial on file",
        detail: `${selected.label} has no weapon serial recorded. An admin must add it on the guard's permit before any weapon can be issued under it.`,
      });
      return;
    }
    if (entered.toLowerCase() !== expected.toLowerCase()) {
      setResult({
        kind: "mismatch",
        title: "DENIED — Weapon does not match permit",
        detail: `The serial you entered (${entered}) does not match the weapon recorded on ${selected.label}. This issuance has NOT been logged. Re-check the firearm and try again, or escalate to a supervisor if the wrong weapon is in stock.`,
      });
      return;
    }

    startTransition(async () => {
      const ok = await logArmoryIssuance({
        guardId,
        locationId,
        permitContext: selected.key,
        weaponSerial: entered,
      });
      if (ok) {
        setResult({
          kind: "approved",
          title: "APPROVED — Issuance logged",
          detail: `Weapon ${entered} issued to ${guardName} under ${selected.label}. Recorded against this armory.`,
        });
        setSerial("");
      } else {
        setResult({
          kind: "error",
          title: "Could not save",
          detail:
            "The issuance wasn't recorded due to a server error. Try again, and if it keeps failing, contact admin before handing over the weapon.",
        });
      }
    });
  }

  if (permits.length === 0) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3 text-sm text-amber-300">
        ⚠ This guard has no weapon permits on file. Nothing can be issued.
      </div>
    );
  }

  return (
    <section className="bg-gradient-to-br from-[#c9a56a]/10 to-[#141414] rounded-2xl border-2 border-[#c9a56a]/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-[#c9a56a]/20 flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-wider text-[#c9a56a] font-bold">
          Armory — Weapon Issuance
        </h2>
      </div>

      {recentArmoryScan && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 text-xs text-amber-300">
          ⚠ A weapon was already issued to this guard in the last 12 hours
          {recentArmoryScan.weaponSerial && (
            <> (serial <span className="font-mono">{recentArmoryScan.weaponSerial}</span>)</>
          )}
          . Verify it was returned before issuing another.
        </div>
      )}

      <form onSubmit={submit} className="p-4 space-y-4">
        {permits.length > 1 && (
          <div>
            <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-1.5">
              Issuing under permit
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {permits.map((p) => (
                <button
                  type="button"
                  key={p.key}
                  onClick={() => setSelectedKey(p.key)}
                  className={`text-left px-3 py-2 rounded-md border text-sm transition ${
                    selectedKey === p.key
                      ? "border-[#c9a56a] bg-[#c9a56a]/10 text-white"
                      : "border-white/10 bg-[#0a0a0a] text-zinc-300 hover:border-white/20"
                  }`}
                >
                  <div className="font-medium">{p.label}</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    Permit {p.permitNumber ?? "—"} · Weapon {p.weaponNumber ?? "—"}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-black/40 rounded-md px-3 py-2 text-xs">
          <span className="text-zinc-500">Expected weapon serial on file:</span>{" "}
          <span className="font-mono text-zinc-200">{expected || "—"}</span>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-1.5">
            Confirm weapon serial number
          </label>
          <input
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            placeholder="Enter the serial as printed on the weapon"
            className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-3 text-white text-base focus:outline-none focus:border-[#c9a56a] focus:ring-1 focus:ring-[#c9a56a]/40 font-mono"
            autoComplete="off"
            spellCheck={false}
            autoCapitalize="characters"
          />
          <div className="text-xs text-zinc-500 mt-1">
            Issuance is only recorded when the serial matches the permit on file.
          </div>
        </div>

        {result && <ResultBanner result={result} />}

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-[#c9a56a] text-black font-semibold py-3 rounded-md hover:bg-[#e0c490] transition disabled:opacity-60"
        >
          {busy ? "Recording…" : "Confirm & Log Issuance"}
        </button>
      </form>
    </section>
  );
}

function ResultBanner({ result }: { result: Result }) {
  // Visual treatment per outcome.
  const styles: Record<
    ResultKind,
    { box: string; icon: React.ReactNode; title: string }
  > = {
    approved: {
      box: "bg-emerald-500/10 border-emerald-500/40 text-emerald-200",
      icon: <span className="text-emerald-300 font-bold">✓</span>,
      title: "text-emerald-300",
    },
    mismatch: {
      box: "bg-red-500/15 border-red-500/50 text-red-200",
      icon: (
        <span aria-hidden className="text-red-300 font-black text-lg leading-none">⛔</span>
      ),
      title: "text-red-300",
    },
    "no-serial": {
      box: "bg-amber-500/10 border-amber-500/40 text-amber-200",
      icon: <span className="text-amber-300 font-bold">!</span>,
      title: "text-amber-300",
    },
    "missing-input": {
      box: "bg-amber-500/10 border-amber-500/40 text-amber-200",
      icon: <span className="text-amber-300 font-bold">!</span>,
      title: "text-amber-300",
    },
    error: {
      box: "bg-red-500/15 border-red-500/40 text-red-200",
      icon: <span className="text-red-300 font-bold">✗</span>,
      title: "text-red-300",
    },
  };
  const s = styles[result.kind];
  return (
    <div
      role={result.kind === "approved" ? "status" : "alert"}
      className={`rounded-md border px-3 py-3 ${s.box}`}
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5 shrink-0">{s.icon}</div>
        <div className="min-w-0">
          <div className={`text-sm font-bold uppercase tracking-wider ${s.title}`}>
            {result.title}
          </div>
          <div className="text-xs mt-1 text-zinc-200/90 leading-relaxed">
            {result.detail}
          </div>
        </div>
      </div>
    </div>
  );
}
