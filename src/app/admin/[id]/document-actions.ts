"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { saveUpload, deleteUpload } from "@/lib/storage";
import { logAdminAction } from "@/lib/audit";
import { CHECKLIST_KEYS, docLabel } from "@/lib/documents";

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

async function revalidateGuard(guardId: string) {
  const g = await prisma.guard.findUnique({
    where: { id: guardId },
    select: { slug: true },
  });
  revalidatePath(`/admin/${guardId}`);
  if (g) revalidatePath(`/p/${g.slug}`);
}

// Save just the issue/expiry dates for a checklist item.
export async function saveDocumentDates(
  guardId: string,
  docType: string,
  data: { issueDate: string; expiryDate: string }
) {
  if (!CHECKLIST_KEYS.has(docType)) return;
  await prisma.guardDocument.upsert({
    where: { guardId_docType: { guardId, docType } },
    update: {
      issueDate: parseDate(data.issueDate),
      expiryDate: parseDate(data.expiryDate),
    },
    create: {
      guardId,
      docType,
      issueDate: parseDate(data.issueDate),
      expiryDate: parseDate(data.expiryDate),
    },
  });
  await logAdminAction({
    action: "guard.update",
    entityType: "guard",
    entityId: guardId,
    summary: `Updated dates for "${docLabel(docType)}"`,
  });
  await revalidateGuard(guardId);
}

// Upload (or replace) the file for a checklist item.
export async function uploadDocument(
  guardId: string,
  docType: string,
  formData: FormData
) {
  if (!CHECKLIST_KEYS.has(docType)) return;
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return;

  const url = await saveUpload(file, `${guardId}-doc-${docType}`, [
    "jpg", "jpeg", "png", "webp", "pdf",
  ]);
  if (!url) return;

  const existing = await prisma.guardDocument.findUnique({
    where: { guardId_docType: { guardId, docType } },
  });
  if (existing?.documentUrl) await deleteUpload(existing.documentUrl);

  await prisma.guardDocument.upsert({
    where: { guardId_docType: { guardId, docType } },
    update: { documentUrl: url },
    create: { guardId, docType, documentUrl: url },
  });

  await logAdminAction({
    action: "guard.update",
    entityType: "guard",
    entityId: guardId,
    summary: `Uploaded "${docLabel(docType)}"`,
  });
  await revalidateGuard(guardId);
}

// Remove the file (keeps the dates row so it stays on the checklist).
export async function deleteDocumentFile(guardId: string, docType: string) {
  if (!CHECKLIST_KEYS.has(docType)) return;
  const existing = await prisma.guardDocument.findUnique({
    where: { guardId_docType: { guardId, docType } },
  });
  if (existing?.documentUrl) await deleteUpload(existing.documentUrl);
  if (existing) {
    await prisma.guardDocument.update({
      where: { guardId_docType: { guardId, docType } },
      data: { documentUrl: null },
    });
  }
  await logAdminAction({
    action: "guard.update",
    entityType: "guard",
    entityId: guardId,
    summary: `Removed file for "${docLabel(docType)}"`,
  });
  await revalidateGuard(guardId);
}
