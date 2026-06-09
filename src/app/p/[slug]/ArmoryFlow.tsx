"use client";

import { useState, useTransition } from "react";
import { logArmoryIssuance, logArmoryReturn } from "./armory-actions";

type Permit = {
  key: "permit1" | "permit2";
  label: string;
  permitNumber: string | null;
  weaponNumber: string | null;
  make: string | null;
  model: string | null;
  clips: number | null;
  expiryDate: string | null;
};

type OpenIssuance = {
  scanId: string;
  weaponSerial: string;
  permitContext: "permit1" | "permit2" | null;
  issuedAt: string;
  make: string | null;
  model: string | null;
};

type ResultKind = "approved" | "returned" | "mismatch" | "no-serial" | "missing-input" | "error";
type Result = { kind: ResultKind; title: string; detail: string };

export function ArmoryFlow({
  guardId,
  guardName,
  locationId,
  guardInactive,
  permits,
  openIssuances,
}: {
  guardId: string;
  guardName: string;
  locationId: string;
  guardInactive: boolean;
  permits: Permit[];
  openIssuances: OpenIssuance[];
}) {
  // Mode default: if any open issuance exists, default to "return".
  // Inactive guards: returns still allowed, new issuance always denied.
  const [mode, setMode] = useState<"return" | "issue">(
    openIssuances.length > 0 ? "return" : "issue"
  );
  const [result, setResult] = useState<Result | null>(null);
  const [busy, startTransition] = useTransition();

  if (permits.length === 0 && openIssuances.length === 0) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3 text-sm text-amber-300">
        ⚠ This guard has no weapon permits on file. Nothing can be issued.
      </div>
    );
  }

  return (
    <section className="bg-gradient-to-br from-[#c9a56a]/10 to-[#141414] rounded-2xl border-2 border-[#c9a56a]/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-[#c9a56a]/20 flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-sm uppercase tracking-wider text-[#c9a56a] font-bold">
          Armory
        </h2>
        {/* Mode toggle, only when both options are meaningful AND guard is active */}
        {openIssuances.length > 0 && permits.length > 0 && !guardInactive && (
          <div className="inline-flex items-center rounded-md bg-black/40 p-0.5">
            <button
              type="button"
              onClick={() => {
                setMode("return");
                setResult(null);
              }}
              className={`text-[11px] uppercase tracking-wider font-bold px-3 py-1.5 rounded ${
                mode === "return"
                  ? "bg-[#c9a56a] text-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Return
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("issue");
                setResult(null);
              }}
              className={`text-[11px] uppercase tracking-wider font-bold px-3 py-1.5 rounded ${
                mode === "issue"
                  ? "bg-[#c9a56a] text-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Issue
            </button>
          </div>
        )}
      </div>

      {guardInactive && (
        <div className="bg-red-500/15 border-b border-red-500/40 px-4 py-3 text-sm text-red-200">
          <div className="flex items-start gap-2">
            <span className="text-lg leading-none font-bold">⛔</span>
            <div>
              <div className="font-bold uppercase tracking-wider text-red-300">
                DENIED — Issuance refused
              </div>
              <div className="text-xs mt-1 text-zinc-200/90 leading-relaxed">
                This guard's status is{" "}
                <strong className="text-red-300">INACTIVE</strong>. No new
                weapons may be issued.
                {openIssuances.length > 0
                  ? " Returns are still accepted below — please collect any outstanding weapons."
                  : ""}
              </div>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="px-4 pt-4">
          <ResultBanner result={result} />
        </div>
      )}

      {/* When guard is inactive: force return view if any open issuance,
          otherwise show nothing actionable (banner above already explains). */}
      {guardInactive && openIssuances.length === 0 ? (
        <div className="p-4 text-sm text-zinc-400">
          No outstanding weapons to return. Nothing to action.
        </div>
      ) : mode === "return" || guardInactive ? (
        openIssuances.length > 0 ? (
          <ReturnView
            guardId={guardId}
            guardName={guardName}
            locationId={locationId}
            openIssuances={openIssuances}
            busy={busy}
            startTransition={startTransition}
            setResult={setResult}
          />
        ) : (
          <div className="p-4 text-sm text-zinc-400">
            No weapons currently issued to this guard.
          </div>
        )
      ) : permits.length > 0 ? (
        <IssueView
          guardId={guardId}
          guardName={guardName}
          locationId={locationId}
          permits={permits}
          recentOpen={openIssuances[0] ?? null}
          busy={busy}
          startTransition={startTransition}
          setResult={setResult}
        />
      ) : (
        <div className="p-4 text-sm text-zinc-400">
          No weapons currently issued and no permits to issue against.
        </div>
      )}
    </section>
  );
}

/* ─── Return view ─────────────────────────────────────────────────────── */

function ReturnView({
  guardId,
  guardName,
  locationId,
  openIssuances,
  busy,
  startTransition,
  setResult,
}: {
  guardId: string;
  guardName: string;
  locationId: string;
  openIssuances: OpenIssuance[];
  busy: boolean;
  startTransition: React.TransitionStartFunction;
  setResult: (r: Result | null) => void;
}) {
  function returnItem(o: OpenIssuance) {
    setResult(null);
    startTransition(async () => {
      const ok = await logArmoryReturn({
        guardId,
        locationId,
        weaponSerial: o.weaponSerial,
        permitContext: o.permitContext,
      });
      if (ok) {
        setResult({
          kind: "returned",
          title: "RETURNED — Logged",
          detail: `${[o.make, o.model].filter(Boolean).join(" ") || "Weapon"} (serial ${o.weaponSerial}) returned by ${guardName}.`,
        });
      } else {
        setResult({
          kind: "error",
          title: "Could not save",
          detail:
            "The return wasn't recorded. Try again, and if it keeps failing, contact admin.",
        });
      }
    });
  }

  return (
    <div className="p-4 space-y-3">
      <div className="text-xs text-zinc-500">
        Currently issued to <span className="text-zinc-300">{guardName}</span>.
        Confirm each weapon as it is handed back.
      </div>
      <ul className="space-y-2">
        {openIssuances.map((o) => (
          <li
            key={o.scanId}
            className="bg-[#0a0a0a] border border-white/10 rounded-md p-3 flex items-start justify-between gap-3 flex-wrap"
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm text-zinc-100 font-medium">
                {[o.make, o.model].filter(Boolean).join(" ") ||
                  `Permit ${o.permitContext?.slice(-1) ?? "?"}`}
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                Serial <span className="font-mono text-zinc-300">{o.weaponSerial}</span>
              </div>
              <div className="text-[11px] text-zinc-600 mt-0.5">
                Issued {new Date(o.issuedAt).toLocaleString("en-GB", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </div>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => returnItem(o)}
              className="bg-sky-500/20 border border-sky-500/40 text-sky-200 font-semibold px-4 py-2 rounded-md hover:bg-sky-500/30 transition disabled:opacity-60"
            >
              {busy ? "Saving…" : "Mark Returned"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Issue view ──────────────────────────────────────────────────────── */

function IssueView({
  guardId,
  guardName,
  locationId,
  permits,
  recentOpen,
  busy,
  startTransition,
  setResult,
}: {
  guardId: string;
  guardName: string;
  locationId: string;
  permits: Permit[];
  recentOpen: OpenIssuance | null;
  busy: boolean;
  startTransition: React.TransitionStartFunction;
  setResult: (r: Result | null) => void;
}) {
  const [selectedKey, setSelectedKey] = useState<string>(permits[0]?.key ?? "");
  const [serial, setSerial] = useState("");

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
        detail: "Enter the weapon serial number stamped on the firearm.",
      });
      return;
    }
    if (!expected) {
      setResult({
        kind: "no-serial",
        title: "Cannot verify — no serial on file",
        detail: `${selected.label} has no weapon serial recorded. An admin must add it before any weapon can be issued under it.`,
      });
      return;
    }
    if (entered.toLowerCase() !== expected.toLowerCase()) {
      setResult({
        kind: "mismatch",
        title: "DENIED — Weapon does not match permit",
        detail: `The serial you entered (${entered}) does not match the weapon recorded on ${selected.label}. This issuance has NOT been logged. Re-check the firearm or escalate to a supervisor.`,
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
          detail: `Weapon ${entered} (${[selected.make, selected.model].filter(Boolean).join(" ") || selected.label}) issued to ${guardName}. Recorded against this armory.`,
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

  return (
    <form onSubmit={submit} className="p-4 space-y-4">
      {recentOpen && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-md px-3 py-2 text-xs text-amber-200">
          ⚠ A weapon is still checked out to this guard
          {recentOpen.weaponSerial && (
            <> (serial <span className="font-mono">{recentOpen.weaponSerial}</span>)</>
          )}
          . Use the Return tab above before issuing another.
        </div>
      )}

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
                  {[p.make, p.model].filter(Boolean).join(" ") ||
                    `Permit ${p.permitNumber ?? "—"}`}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-black/40 rounded-md px-3 py-3 space-y-1.5 text-xs">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500">
          Weapon on file for this guard
        </div>
        <div className="grid grid-cols-2 gap-y-1.5 gap-x-3">
          <div className="col-span-2">
            <span className="text-zinc-500">Make / Model:</span>{" "}
            <span className="text-zinc-100 font-medium">
              {[selected?.make, selected?.model].filter(Boolean).join(" ") || "—"}
            </span>
          </div>
          <div>
            <span className="text-zinc-500">Serial:</span>{" "}
            <span className="font-mono text-zinc-200">{expected || "—"}</span>
          </div>
          <div>
            <span className="text-zinc-500">Clips:</span>{" "}
            <span className="text-zinc-100 font-medium">
              {selected?.clips ?? "—"}
            </span>
          </div>
        </div>
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

      <button
        type="submit"
        disabled={busy}
        className="w-full bg-[#c9a56a] text-black font-semibold py-3 rounded-md hover:bg-[#e0c490] transition disabled:opacity-60"
      >
        {busy ? "Recording…" : "Confirm & Log Issuance"}
      </button>
    </form>
  );
}

/* ─── Banner ──────────────────────────────────────────────────────────── */

function ResultBanner({ result }: { result: Result }) {
  const styles: Record<ResultKind, { box: string; titleColor: string; icon: string }> = {
    approved: {
      box: "bg-emerald-500/10 border-emerald-500/40 text-emerald-200",
      titleColor: "text-emerald-300",
      icon: "✓",
    },
    returned: {
      box: "bg-sky-500/10 border-sky-500/40 text-sky-200",
      titleColor: "text-sky-300",
      icon: "↩",
    },
    mismatch: {
      box: "bg-red-500/15 border-red-500/50 text-red-200",
      titleColor: "text-red-300",
      icon: "⛔",
    },
    "no-serial": {
      box: "bg-amber-500/10 border-amber-500/40 text-amber-200",
      titleColor: "text-amber-300",
      icon: "!",
    },
    "missing-input": {
      box: "bg-amber-500/10 border-amber-500/40 text-amber-200",
      titleColor: "text-amber-300",
      icon: "!",
    },
    error: {
      box: "bg-red-500/15 border-red-500/40 text-red-200",
      titleColor: "text-red-300",
      icon: "✗",
    },
  };
  const s = styles[result.kind];
  return (
    <div role={result.kind === "mismatch" || result.kind === "error" ? "alert" : "status"} className={`rounded-md border px-3 py-3 ${s.box}`}>
      <div className="flex items-start gap-2">
        <div className={`mt-0.5 shrink-0 text-lg leading-none font-bold ${s.titleColor}`}>
          {s.icon}
        </div>
        <div className="min-w-0">
          <div className={`text-sm font-bold uppercase tracking-wider ${s.titleColor}`}>
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
