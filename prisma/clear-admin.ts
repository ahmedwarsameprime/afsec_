// One-off helper to clear stuck flags on an admin account.
// Usage:
//   $env:DATABASE_URL = "postgres://..."
//   $env:TARGET_EMAIL = "admin@soc-afsec.com"   (optional, defaults to that)
//   npx tsx prisma/clear-admin.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.TARGET_EMAIL ?? "admin@soc-afsec.com")
    .toLowerCase()
    .trim();

  const updated = await prisma.user.updateMany({
    where: { email },
    data: {
      mustChangePassword: false,
      lockedAt: null,
      lockReason: null,
      totpEnabled: false,
      totpSecret: null,
      totpEnrolledAt: null,
    },
  });

  console.log(
    `✔ Cleared mustChangePassword / lockedAt / 2FA for ${email} (${updated.count} row${updated.count === 1 ? "" : "s"})`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
