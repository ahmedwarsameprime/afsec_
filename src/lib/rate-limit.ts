import { prisma } from "@/lib/prisma";

const IP_WINDOW_MS = 5 * 60 * 1000;
const IP_MAX_FAILED = 5;
const EMAIL_WINDOW_MS = 60 * 60 * 1000;
const EMAIL_MAX_FAILED = 10;

export async function checkLoginRateLimit(ipAddress: string): Promise<{
  allowed: boolean;
  retryAfterSeconds: number;
}> {
  if (!ipAddress) return { allowed: true, retryAfterSeconds: 0 };
  const since = new Date(Date.now() - IP_WINDOW_MS);
  const recentFailures = await prisma.loginAttempt.count({
    where: { ipAddress, succeeded: false, at: { gte: since } },
  });
  if (recentFailures >= IP_MAX_FAILED) {
    const oldest = await prisma.loginAttempt.findFirst({
      where: { ipAddress, succeeded: false, at: { gte: since } },
      orderBy: { at: "asc" },
    });
    const retryAfterSeconds = oldest
      ? Math.max(1, Math.ceil((oldest.at.getTime() + IP_WINDOW_MS - Date.now()) / 1000))
      : 60;
    return { allowed: false, retryAfterSeconds };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export async function lockoutCheckByEmail(email: string): Promise<{ locked: boolean; reason?: string }> {
  if (!email) return { locked: false };
  const since = new Date(Date.now() - EMAIL_WINDOW_MS);
  const failed = await prisma.loginAttempt.count({
    where: { email, succeeded: false, at: { gte: since } },
  });
  if (failed < EMAIL_MAX_FAILED) return { locked: false };
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { locked: false };
  if (user.lockedAt) return { locked: true, reason: user.lockReason ?? undefined };
  await prisma.user.update({
    where: { email },
    data: {
      lockedAt: new Date(),
      lockReason: `${EMAIL_MAX_FAILED} failed sign-ins within an hour`,
    },
  });
  return { locked: true, reason: `${EMAIL_MAX_FAILED} failed sign-ins within an hour` };
}

export async function recordLoginAttempt(args: {
  ipAddress: string;
  email: string;
  succeeded: boolean;
}) {
  if (!args.ipAddress) return;
  await prisma.loginAttempt.create({
    data: { ipAddress: args.ipAddress, email: args.email, succeeded: args.succeeded },
  });
}
