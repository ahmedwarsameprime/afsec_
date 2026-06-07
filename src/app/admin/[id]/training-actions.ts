"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

type FormInput = {
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate: string;
  active: boolean;
};

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export async function addTraining(guardId: string, data: FormInput) {
  await prisma.training.create({
    data: {
      guardId,
      name: data.name.trim(),
      issuer: data.issuer.trim() || null,
      issueDate: parseDate(data.issueDate),
      expiryDate: parseDate(data.expiryDate),
      active: data.active,
    },
  });
  const g = await prisma.guard.findUnique({
    where: { id: guardId },
    select: { slug: true },
  });
  revalidatePath(`/admin/${guardId}`);
  if (g) revalidatePath(`/p/${g.slug}`);
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
      active: data.active,
    },
  });
  const g = await prisma.guard.findUnique({
    where: { id: guardId },
    select: { slug: true },
  });
  revalidatePath(`/admin/${guardId}`);
  if (g) revalidatePath(`/p/${g.slug}`);
}

export async function deleteTraining(id: string, guardId: string) {
  await prisma.training.delete({ where: { id } });
  const g = await prisma.guard.findUnique({
    where: { id: guardId },
    select: { slug: true },
  });
  revalidatePath(`/admin/${guardId}`);
  if (g) revalidatePath(`/p/${g.slug}`);
}
