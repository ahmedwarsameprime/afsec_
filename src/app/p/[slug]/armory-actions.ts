"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { headers } from "next/headers";

export async function logArmoryIssuance(input: {
  guardId: string;
  locationId: string;
  permitContext: "permit1" | "permit2";
  weaponSerial: string;
}): Promise<boolean> {
  const session = await auth();
  if (!session?.user) return false;
  if (session.user.role !== "operator") return false;
  if (session.user.locationId !== input.locationId) return false;
  if (session.user.locationType !== "armory") return false;

  // Re-verify the serial server-side against the guard's permit record.
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
      scannedById: session.user.id,
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
