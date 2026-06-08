"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { saveUpload, deleteUpload } from "@/lib/storage";

type FormInput = {
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate: string;
};

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

export async function addTraining(guardId: string, data: FormInput) {
  await prisma.training.create({
    data: {
      guardId,
      name: data.name.trim(),
      issuer: data.issuer.trim() || null,
      issueDate: parseDate(data.issueDate),
      expiryDate: parseDate(data.expiryDate),
    },
  });
  await revalidateGuard(guardId);
}

export async function updateTraining(
  id: string,
  guardId: string,
  data: FormInput
) {
  await prisma.training.update({
    where: { id },
    data: {
      name: data.name.trim(),
      issuer: data.issuer.trim() || null,
      issueDate: parseDate(data.issueDate),
      expiryDate: parseDate(data.expiryDate),
    },
  });
  await revalidateGuard(guardId);
}

export async function deleteTraining(id: string, guardId: string) {
  const t = await prisma.training.findUnique({
    where: { id },
    select: { documentUrl: true },
  });
  if (t?.documentUrl) await deleteUpload(t.documentUrl);
  await prisma.training.delete({ where: { id } });
  await revalidateGuard(guardId);
}

export async function replaceTrainingDocument(
  trainingId: string,
  guardId: string,
  formData: FormData
) {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return;

  const url = await saveUpload(file, `${guardId}-training-${trainingId}`, [
    "jpg", "jpeg", "png", "webp", "pdf",
  ]);
  if (!url) return;

  const existing = await prisma.training.findUnique({
    where: { id: trainingId },
    select: { documentUrl: true },
  });
  if (existing?.documentUrl) await deleteUpload(existing.documentUrl);

  await prisma.training.update({
    where: { id: trainingId },
    data: { documentUrl: url },
  });

  await revalidateGuard(guardId);
}
