import NextAuth, { type DefaultSession, CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyTotp } from "@/lib/twofa";

class AccountLockedError extends CredentialsSignin {
  code = "account_locked";
}
class TotpRequiredError extends CredentialsSignin {
  code = "totp_required";
}
class TotpInvalidError extends CredentialsSignin {
  code = "totp_invalid";
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "operator";
      mustChangePassword: boolean;
      locationId: string | null;
      locationName?: string | null;
      locationType?: "site" | "armory" | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: "admin" | "operator";
    mustChangePassword?: boolean;
    locationId?: string | null;
    locationName?: string | null;
    locationType?: "site" | "armory" | null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24h
  },
  pages: { signIn: "/admin/login" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        code: { label: "2FA code", type: "text" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");
        const code = String(credentials?.code ?? "").trim();
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          include: { location: true },
        });
        if (!user) return null;

        if (user.lockedAt) throw new AccountLockedError();

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        if (user.totpEnabled) {
          if (!code) throw new TotpRequiredError();
          const valid =
            user.totpSecret && verifyTotp({ token: code, secret: user.totpSecret });
          if (!valid) throw new TotpInvalidError();
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: (user.role as "admin" | "operator") ?? "admin",
          mustChangePassword: user.mustChangePassword ?? false,
          locationId: user.locationId,
          locationName: user.location?.name ?? null,
          locationType: (user.location?.type as "site" | "armory" | null) ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        const u = user as {
          role?: "admin" | "operator";
          mustChangePassword?: boolean;
          locationId?: string | null;
          locationName?: string | null;
          locationType?: "site" | "armory" | null;
        };
        token.role = u.role ?? "admin";
        token.mustChangePassword = u.mustChangePassword ?? false;
        token.locationId = u.locationId ?? null;
        token.locationName = u.locationName ?? null;
        token.locationType = u.locationType ?? null;
      }
      if (trigger === "update") {
        token.mustChangePassword = false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const t = token as {
          sub?: string;
          role?: "admin" | "operator";
          mustChangePassword?: boolean;
          locationId?: string | null;
          locationName?: string | null;
          locationType?: "site" | "armory" | null;
        };
        session.user.id = t.sub ?? "";
        session.user.role = t.role ?? "admin";
        session.user.mustChangePassword = t.mustChangePassword ?? false;
        session.user.locationId = t.locationId ?? null;
        session.user.locationName = t.locationName ?? null;
        session.user.locationType = t.locationType ?? null;

        // Refresh security-critical flags from DB on every request.
        // The stateless JWT can't know if an admin changed these since
        // sign-in (mustChangePassword set, account locked, role demoted,
        // etc.) — without this re-check, those changes wait until the
        // 24h JWT expires.
        if (session.user.id) {
          try {
            const fresh = await prisma.user.findUnique({
              where: { id: session.user.id },
              select: {
                role: true,
                mustChangePassword: true,
                lockedAt: true,
                locationId: true,
                location: { select: { name: true, type: true } },
              },
            });
            if (!fresh || fresh.lockedAt) {
              // Locked or deleted → strip the session so proxy treats
              // them as signed out.
              return { ...session, user: undefined } as unknown as typeof session;
            }
            session.user.role = (fresh.role as "admin" | "operator") ?? session.user.role;
            session.user.mustChangePassword = fresh.mustChangePassword;
            session.user.locationId = fresh.locationId;
            session.user.locationName = fresh.location?.name ?? null;
            session.user.locationType = (fresh.location?.type as "site" | "armory" | null) ?? null;
          } catch {
            /* DB blip → fall back to JWT values */
          }
        }
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
      const isFile = path.startsWith("/api/file");
      if (isAdminArea || isProfile || isScan || isFile) return !!auth?.user;
      return true;
    },
  },
});
