"use client";

import { useState, useTransition } from "react";
import { formatDate, dateInputValue, expiryStatus } from "@/lib/dates";
import { StatusBadge } from "@/components/StatusBadge";
import { addTraining, deleteTraining, updateTraining } from "./training-actions";

type Training = {
  id: string;
  name: string;
  issuer: string | null;
  issueDate: Date | null;
  expiryDate: Date | null;
  active: boolean;
};

export function TrainingEditor({
  guardId,
  trainings,
}: {
  guardId: string;
  trainings: Training[];
}) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <section className="bg-[#141414] rounded-2xl border border-white/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-wider text-[#c9a56a] font-semibold">
          Training History ({trainings.length})
        </h2>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-xs font-medium px-3 py-1.5 rounded-md bg-[#c9a56a]/10 text-[#c9a56a] border border-[#c9a56a]/30 hover:bg-[#c9a56a]/20"
          >
            + Add Training
          </button>
        )}
      </div>

      {adding && (
        <div className="border-b border-white/5 p-4 bg-black/20">
          <TrainingForm
            onCancel={() => setAdding(false)}
            onSubmit={(data) => {
              startTransition(async () => {
                await addTraining(guardId, data);
                setAdding(false);
              });
            }}
            busy={isPending}
          />
        </div>
      )}

      {trainings.length === 0 && !adding ? (
        <div className="px-4 py-8 text-center text-sm text-zinc-500">
          No trainings recorded yet.
        </div>
      ) : (
        <ul className="divide-y divide-white/5">
          {trainings.map((t) => (
            <li key={t.id} className="p-4">
              {editing === t.id ? (
                <TrainingForm
                  initial={t}
                  onCancel={() => setEditing(null)}
                  onSubmit={(data) => {
                    startTransition(async () => {
                      await updateTraining(t.id, guardId, data);
                      setEditing(null);
                    });
                  }}
                  busy={isPending}
                />
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-white">{t.name}</div>
                      <StatusBadge
                        status={
                          !t.active ? "inactive" : expiryStatus(t.expiryDate)
                        }
                      />
                    </div>
                    {t.issuer && (
                      <div className="text-xs text-zinc-500 mt-0.5">
                        {t.issuer}
                      </div>
                    )}
                    <div className="text-xs text-zinc-400 mt-1">
                      Issued {formatDate(t.issueDate)} · Expires{" "}
                      {formatDate(t.expiryDate)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(t.id)}
                      className="text-xs text-zinc-400 hover:text-white"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        if (!confirm(`Delete training "${t.name}"?`)) return;
                        startTransition(() => deleteTraining(t.id, guardId));
                      }}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type FormData = {
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate: string;
  active: boolean;
};

function TrainingForm({
  initial,
  onSubmit,
  onCancel,
  busy,
}: {
  initial?: Training;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [issuer, setIssuer] = useState(initial?.issuer ?? "");
  const [issueDate, setIssueDate] = useState(dateInputValue(initial?.issueDate));
  const [expiryDate, setExpiryDate] = useState(dateInputValue(initial?.expiryDate));
  const [active, setActive] = useState(initial?.active ?? true);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name, issuer, issueDate, expiryDate, active });
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="sm:col-span-2">
        <Label>Certification Name *</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Firearms Handling Level 2"
          required
        />
      </div>
      <div>
        <Label>Issuer</Label>
        <Input
          value={issuer}
          onChange={(e) => setIssuer(e.target.value)}
          placeholder="e.g. Somali Police Training Academy"
        />
      </div>
      <div>
        <Label>Status</Label>
        <label className="flex items-center gap-2 h-[38px]">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="w-5 h-5 accent-[#c9a56a]"
          />
          <span className="text-sm text-zinc-300">Active</span>
        </label>
      </div>
      <div>
        <Label>Issue Date</Label>
        <Input
          type="date"
          value={issueDate}
          onChange={(e) => setIssueDate(e.target.value)}
        />
      </div>
      <div>
        <Label>Expiry Date</Label>
        <Input
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
        />
      </div>
      <div className="sm:col-span-2 flex items-center gap-2 pt-2">
        <button
          type="submit"
          disabled={busy}
          className="bg-[#c9a56a] text-black font-semibold px-4 py-2 rounded-md hover:bg-[#e0c490] disabled:opacity-60"
        >
          {busy ? "Saving…" : initial ? "Update" : "Add"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-zinc-400 hover:text-white"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">
      {children}
    </div>
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
