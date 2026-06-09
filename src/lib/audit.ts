import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { auth } from "@/auth";
import type { Prisma } from "@prisma/client";

export type AuditEntityType =
  | "guard"
  | "operator"
  | "location"
  | "training"
  | "user";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "status_change"
  | "password_reset"
  | "password_changed";

export async function logAdminAction(args: {
  action: `${AuditEntityType}.${AuditAction}`;
  entityType: AuditEntityType;
  entityId: string | null;
  summary?: string;
  changes?: Prisma.InputJsonValue | Record<string, unknown>;
  actorIdOverride?: string;
}) {
  let actorId = args.actorIdOverride ?? null;
  if (!actorId) {
    const session = await auth();
    actorId = session?.user?.id ?? null;
  }
  let ip: string | null = null;
  let ua: string | null = null;
  try {
    const h = await headers();
    ip = h.get("x-forwarded-for") ?? null;
    ua = h.get("user-agent") ?? null;
  } catch { /* ignore */ }

  await prisma.adminAuditLog.create({
    data: {
      actorId,
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId,
      summary: args.summary ?? null,
      changes: args.changes
        ? (JSON.parse(JSON.stringify(args.changes)) as Prisma.InputJsonValue)
        : undefined,
      ipAddress: ip,
      userAgent: ua,
    },
  });
}

export function diffFields<T extends Record<string, unknown>>(
  before: T,
  after: T,
  fields: (keyof T)[]
): Record<string, [unknown, unknown]> | null {
  const out: Record<string, [unknown, unknown]> = {};
  for (const f of fields) {
    const b = before[f];
    const a = after[f];
    const eq =
      b instanceof Date && a instanceof Date ? b.getTime() === a.getTime() : b === a;
    if (!eq) {
      out[String(f)] = [
        b instanceof Date ? b.toISOString() : (b as unknown),
        a instanceof Date ? a.toISOString() : (a as unknown),
      ];
    }
  }
  return Object.keys(out).length ? out : null;
}
