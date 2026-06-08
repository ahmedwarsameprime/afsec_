"use client";

import { useState, useTransition, useRef } from "react";
import { formatDate, dateInputValue, expiryStatus } from "@/lib/dates";
import { StatusBadge } from "@/components/StatusBadge";
import {
  addTraining,
  deleteTraining,
  updateTraining,
  replaceTrainingDocument,
} from "./training-actions";

type Training = {
  id: string;
  name: string;
  issuer: string | null;
  issueDate: Date | null;
  expiryDate: Date | null;
  documentUrl: string | null;
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
            onSubmit={(fd) => {
              startTransition(async () => {
                await addTraining(guardId, fd);
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
          {trainings.map((t) => {
            const hasDoc = !!t.documentUrl;
            const expired = t.expiryDate ? expiryStatus(t.expiryDate) === "expired" : false;
            const status = !hasDoc
              ? "none"
              : expired
                ? "expired"
                : expiryStatus(t.expiryDate);

            return (
              <li key={t.id} className="p-4">
                {editing === t.id ? (
                  <TrainingForm
                    initial={t}
                    onCancel={() => setEditing(null)}
                    onSubmit={(fd) => {
                      startTransition(async () => {
                        await updateTraining(t.id, guardId, fd);
                        setEditing(null);
                      });
                    }}
                    busy={isPending}
                  />
                ) : (
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-medium text-white">{t.name}</div>
                        <StatusBadge
                          status={status}
                          label={!hasDoc ? "Document missing" : undefined}
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
                      <div className="mt-2">
                        <TrainingDocActions
                          trainingId={t.id}
                          guardId={guardId}
                          existingUrl={t.documentUrl}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
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
            );
          })}
        </ul>
      )}
    </section>
  );
}

function TrainingDocActions({
  trainingId,
  guardId,
  existingUrl,
}: {
  trainingId: string;
  guardId: string;
  existingUrl: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  function pick() {
    fileRef.current?.click();
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    startTransition(async () => {
      await replaceTrainingDocument(trainingId, guardId, fd);
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {existingUrl && (
        <a
          href={existingUrl}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#c9a56a]/10 border border-[#c9a56a]/30 text-[#c9a56a] text-xs hover:bg-[#c9a56a]/20"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Current document
        </a>
      )}
      <button
        type="button"
        onClick={pick}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-white/15 text-zinc-300 text-xs hover:bg-white/5 disabled:opacity-60"
      >
        {isPending
          ? "Uploading…"
          : existingUrl
            ? "Replace document"
            : "+ Upload certificate"}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={onChange}
        className="hidden"
      />
    </div>
  );
}

type FormState = {
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate: string;
};

function TrainingForm({
  initial,
  onSubmit,
  onCancel,
  busy,
}: {
  initial?: Training;
  onSubmit: (data: FormState) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [issuer, setIssuer] = useState(initial?.issuer ?? "");
  const [issueDate, setIssueDate] = useState(dateInputValue(initial?.issueDate));
  const [expiryDate, setExpiryDate] = useState(dateInputValue(initial?.expiryDate));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name, issuer, issueDate, expiryDate });
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
      <div className="sm:col-span-2">
        <Label>Issuer</Label>
        <Input
          value={issuer}
          onChange={(e) => setIssuer(e.target.value)}
          placeholder="e.g. Somali Police Training Academy"
        />
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
      <div className="sm:col-span-2 text-xs text-zinc-500">
        Upload the certificate after saving — the document upload appears on
        the row.
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
