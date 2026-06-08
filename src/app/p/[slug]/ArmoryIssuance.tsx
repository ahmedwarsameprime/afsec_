"use client";

import { useState, useTransition } from "react";
import { logArmoryIssuance } from "./armory-actions";

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
  const [result, setResult] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  const selected = permits.find((p) => p.key === selectedKey);
  const expected = selected?.weaponNumber ?? "";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    if (!selected) {
      setResult({ type: "error", msg: "Select a permit to issue against." });
      return;
    }
    const entered = serial.trim();
    if (!entered) {
      setResult({ type: "error", msg: "Enter the weapon serial number." });
      return;
    }
    // Match must be exact (case-insensitive) against the weapon number on file.
    if (!expected) {
      setResult({
        type: "error",
        msg: `No weapon serial is on file for ${selected.label}. Have admin add it before issuing.`,
      });
      return;
    }
    if (entered.toLowerCase() !== expected.toLowerCase()) {
      setResult({
        type: "error",
        msg: `Serial does not match. Expected: ${expected}`,
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
          type: "success",
          msg: `${selected.label.split(" — ")[1] ?? "Weapon"} issued to ${guardName} (serial ${entered}). Logged.`,
        });
        setSerial("");
      } else {
        setResult({
          type: "error",
          msg: "Could not record issuance. Please try again.",
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

        {result && (
          <div
            className={`rounded-md px-3 py-2 text-sm ${
              result.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                : "bg-red-500/10 border border-red-500/30 text-red-300"
            }`}
          >
            {result.type === "success" ? "✓ " : "✗ "}
            {result.msg}
          </div>
        )}

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
