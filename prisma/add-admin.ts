// Idempotent admin creator. Run with:
//   $env:DATABASE_URL = "<your prod URL>"
//   $env:ADMIN_EMAIL = "user@example.com"
//   $env:ADMIN_PASSWORD = "their-password"
//   $env:ADMIN_NAME = "Display Name"   # optional
//   npx tsx prisma/add-admin.ts
//
// If the email already exists, the password is updated (use to reset
// passwords too). Otherwise a new admin is created.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD ?? "";
  const name = process.env.ADMIN_NAME ?? null;

  if (!email || !password) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD env vars first.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hash, mustChangePassword: true, ...(name ? { name } : {}) },
    create: { email, password: hash, name, mustChangePassword: true },
  });

  console.log(`✔ Admin ready: ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
