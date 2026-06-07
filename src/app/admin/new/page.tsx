import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/slug";

export default async function NewGuardPage() {
  async function create() {
    "use server";
    const guard = await prisma.guard.create({
      data: {
        slug: generateSlug(),
        firstName: "New",
        lastName: "Guard",
        jobTitle: "Security Officer",
      },
    });
    redirect(`/admin/${guard.id}`);
  }

  // Auto-create on visit so the user lands on the edit form immediately.
  await create();
  return null;
}
