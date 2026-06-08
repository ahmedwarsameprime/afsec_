import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "operator";
      locationId: string | null;
      locationName?: string | null;
      locationType?: "site" | "armory" | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: "admin" | "operator";
    locationId?: string | null;
    locationName?: string | null;
    locationType?: "site" | "armory" | null;
  }
}

// JWT shape extended via callback type-casts below — direct
// module augmentation of "next-auth/jwt" isn't reliable in v5 beta yet.

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/admin/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          include: { location: true },
        });
        if (!user) return null;

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: (user.role as "admin" | "operator") ?? "admin",
          locationId: user.locationId,
          locationName: user.location?.name ?? null,
          locationType: (user.location?.type as "site" | "armory" | null) ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as {
          role?: "admin" | "operator";
          locationId?: string | null;
          locationName?: string | null;
          locationType?: "site" | "armory" | null;
        };
        token.role = u.role ?? "admin";
        token.locationId = u.locationId ?? null;
        token.locationName = u.locationName ?? null;
        token.locationType = u.locationType ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const t = token as {
          sub?: string;
          role?: "admin" | "operator";
          locationId?: string | null;
          locationName?: string | null;
          locationType?: "site" | "armory" | null;
        };
        session.user.id = t.sub ?? "";
        session.user.role = t.role ?? "admin";
        session.user.locationId = t.locationId ?? null;
        session.user.locationName = t.locationName ?? null;
        session.user.locationType = t.locationType ?? null;
      }
      return session;
    },
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      const isLogin = path === "/admin/login";
      if (isLogin) return true;

      const isAdminArea = path.startsWith("/admin");
      const isProfile = path.startsWith("/p/");
      const isScan = path === "/scan" || path.startsWith("/scan/");

      // Protected: admin area, profile pages, and operator scan landing.
      if (isAdminArea || isProfile || isScan) return !!auth?.user;

      return true;
    },
  },
});
