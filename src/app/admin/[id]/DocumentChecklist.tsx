"use client";

import { useRef, useState, useTransition } from "react";
import { FILE_CHECKLIST } from "@/lib/documents";
import { dateInputValue, formatDate, expiryStatus } from "@/lib/dates";
import { proxiedFileUrl } from "@/lib/file-url";
import {
  saveDocumentDates,
  uploadDocument,
  deleteDocumentFile,
} from "./document-actions";

type DocRecord = {
  docType: string;
  documentUrl: string | null;
  issueDate: Date | null;
  expiryDate: Date | null;
};

export function DocumentChecklist({
  guardId,
  documents,
}: {
  guardId: string;
  documents: DocRecord[];
}) {
  const byType = new Map(documents.map((d) => [d.docType, d]));
  const uploadedCount = documents.filter((d) => d.documentUrl).length;

  return (
    <section className="bg-[#141414] rounded-2xl border border-white/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xs uppercase tracking-wider text-[#c9a56a] font-semibold">
          File Inspection Checklist
        </h2>
        <span className="text-xs text-zinc-500">
          {uploadedCount} / {FILE_CHECKLIST.length} uploaded
        </span>
      </div>
      <ul className="divide-y divide-white/5">
        {FILE_CHECKLIST.map((spec) => (
          <DocRow
            key={spec.key}
            guardId={guardId}
            docKey={spec.key}
            label={spec.label}
            record={byType.get(spec.key) ?? null}
          />
        ))}
      </ul>
    </section>
  );
}

function DocRow({
  guardId,
  docKey,
  label,
  record,
}: {
  guardId: string;
  docKey: string;
  label: string;
  record: DocRecord | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, startTransition] = useTransition();
  const [issueDate, setIssueDate] = useState(dateInputValue(record?.issueDate));
  const [expiryDate, setExpiryDate] = useState(dateInputValue(record?.expiryDate));
  const [dirty, setDirty] = useState(false);

  const hasFile = !!record?.documentUrl;
  const status = hasFile
    ? record?.expiryDate
      ? expiryStatus(record.expiryDate)
      : "ok"
    : "missing";

  const badge =
    status === "ok"
      ? { cls: "bg-emerald-500/15 text-emerald-300", label: "Uploaded" }
      : status === "soon"
        ? { cls: "bg-amber-500/15 text-amber-300", label: "Expiring soon" }
        : status === "expired"
          ? { cls: "bg-red-500/15 text-red-300", label: "Expired" }
          : { cls: "bg-zinc-500/15 text-zinc-400", label: "Missing" };

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    startTransition(async () => {
      await uploadDocument(guardId, docKey, fd);
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  function saveDates() {
    startTransition(async () => {
      await saveDocumentDates(guardId, docKey, { issueDate, expiryDate });
      setDirty(false);
    });
  }

  return (
    <li className="p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-zinc-100">{label}</span>
            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
          {(record?.issueDate || record?.expiryDate) && (
            <div className="text-xs text-zinc-500 mt-0.5">
              {record?.issueDate && <>Issued {formatDate(record.issueDate)} · </>}
              {record?.expiryDate && <>Expires {formatDate(record.expiryDate)}</>}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
        <label className="block">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Issue date</div>
          <input
            type="date"
            value={issueDate}
            onChange={(e) => { setIssueDate(e.target.value); setDirty(true); }}
            className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-[#c9a56a]"
          />
        </label>
        <label className="block">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Expiry date</div>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => { setExpiryDate(e.target.value); setDirty(true); }}
            className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-[#c9a56a]"
          />
        </label>
        {dirty && (
          <button
            type="button"
            onClick={saveDates}
            disabled={busy}
            className="bg-[#c9a56a] text-black font-semibold px-3 py-2 rounded-md hover:bg-[#e0c490] text-sm disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save dates"}
          </button>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2 flex-wrap">
        {hasFile && (
          <a
            href={proxiedFileUrl(record!.documentUrl) ?? record!.documentUrl!}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#c9a56a]/10 border border-[#c9a56a]/30 text-[#c9a56a] text-xs hover:bg-[#c9a56a]/20"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            View document
          </a>
        )}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-white/15 text-zinc-300 text-xs hover:bg-white/5 disabled:opacity-60"
        >
          {busy ? "Uploading…" : hasFile ? "Replace file" : "+ Upload file"}
        </button>
        {hasFile && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (!confirm(`Remove uploaded file for "${label}"?`)) return;
              startTransition(() => deleteDocumentFile(guardId, docKey));
            }}
            className="text-xs text-red-400 hover:text-red-300"
          >
            Remove file
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={onFile}
          className="hidden"
        />
      </div>
    </li>
  );
}
