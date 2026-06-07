type Props = {
  status: "active" | "inactive" | "expired" | "soon" | "ok" | "none" | string;
  label?: string;
};

export function StatusBadge({ status, label }: Props) {
  const map: Record<string, { bg: string; text: string; dot: string; defaultLabel: string }> = {
    active: { bg: "bg-emerald-500/15", text: "text-emerald-300", dot: "bg-emerald-400", defaultLabel: "Active" },
    ok: { bg: "bg-emerald-500/15", text: "text-emerald-300", dot: "bg-emerald-400", defaultLabel: "Valid" },
    inactive: { bg: "bg-zinc-500/15", text: "text-zinc-300", dot: "bg-zinc-400", defaultLabel: "Inactive" },
    none: { bg: "bg-zinc-500/15", text: "text-zinc-400", dot: "bg-zinc-500", defaultLabel: "Not set" },
    soon: { bg: "bg-amber-500/15", text: "text-amber-300", dot: "bg-amber-400", defaultLabel: "Expiring soon" },
    expired: { bg: "bg-red-500/15", text: "text-red-300", dot: "bg-red-400", defaultLabel: "Expired" },
  };
  const s = map[status] ?? map.none;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {label ?? s.defaultLabel}
    </span>
  );
}
