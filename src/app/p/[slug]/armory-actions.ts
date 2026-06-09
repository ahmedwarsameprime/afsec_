"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { headers } from "next/headers";

async function commonGuards(input: { locationId: string }): Promise<{
  ok: false;
} | {
  ok: true;
  userId: string;
}> {
  const session = await auth();
  if (!session?.user) return { ok: false };
  if (session.user.role !== "operator") return { ok: false };
  if (session.user.locationId !== input.locationId) return { ok: false };
  if (session.user.locationType !== "armory") return { ok: false };
  return { ok: true, userId: session.user.id };
}

export async function logArmoryIssuance(input: {
  guardId: string;
  locationId: string;
  permitContext: "permit1" | "permit2";
  weaponSerial: string;
}): Promise<boolean> {
  const ok = await commonGuards(input);
  if (!ok.ok) return false;

  const guard = await prisma.guard.findUnique({
    where: { id: input.guardId },
    select: {
      permit1WeaponNumber: true,
      permit2WeaponNumber: true,
    },
  });
  if (!guard) return false;

  const expected =
    input.permitContext === "permit1"
      ? guard.permit1WeaponNumber
      : guard.permit2WeaponNumber;

  if (!expected) return false;
  if (expected.toLowerCase() !== input.weaponSerial.toLowerCase()) return false;

  const h = await headers();
  await prisma.scanLog.create({
    data: {
      guardId: input.guardId,
      scannedById: ok.userId,
      locationId: input.locationId,
      scanType: "armory_out",
      weaponSerial: input.weaponSerial,
      permitContext: input.permitContext,
      ipAddress: h.get("x-forwarded-for") ?? null,
      userAgent: h.get("user-agent") ?? null,
    },
  });
  return true;
}

export async function logArmoryReturn(input: {
  guardId: string;
  locationId: string;
  weaponSerial: string;
  permitContext: "permit1" | "permit2" | null;
}): Promise<boolean> {
  const ok = await commonGuards(input);
  if (!ok.ok) return false;

  if (!input.weaponSerial) return false;

  // Sanity check: there must be an open issuance for this weaponSerial
  // (i.e. an armory_out without a later armory_in).
  const scans = await prisma.scanLog.findMany({
    where: {
      guardId: input.guardId,
      locationId: input.locationId,
      scanType: { in: ["armory_out", "armory_in"] },
      weaponSerial: input.weaponSerial,
    },
    orderBy: { scannedAt: "asc" },
  });

  // Walk to confirm the last entry for this serial is armory_out.
  const last = scans[scans.length - 1];
  if (!last || last.scanType !== "armory_out") return false;

  const h = await headers();
  await prisma.scanLog.create({
    data: {
      guardId: input.guardId,
      scannedById: ok.userId,
      locationId: input.locationId,
      scanType: "armory_in",
      weaponSerial: input.weaponSerial,
      permitContext: input.permitContext ?? last.permitContext ?? null,
      ipAddress: h.get("x-forwarded-for") ?? null,
      userAgent: h.get("user-agent") ?? null,
    },
  });
  return true;
}
