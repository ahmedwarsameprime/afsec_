import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Wrapping auth((req) => ...) gives us req.auth but bypasses NextAuth's
// automatic redirect-to-login. We MUST enforce auth ourselves for every
// protected path; otherwise unauthenticated requests fall through.

export const proxy = auth((req) => {
  const path = req.nextUrl.pathname;

  // Login is always reachable without auth.
  if (path === "/admin/login") return undefined;

  const isAdminArea = path.startsWith("/admin");
  const isProfile = path.startsWith("/p/");
  const isScan = path === "/scan" || path.startsWith("/scan/");
  const isFile = path.startsWith("/api/file");
  const isProtected = isAdminArea || isProfile || isScan || isFile;

  // === HARD AUTH GATE ===
  // No session → bounce to login regardless of which page they wanted.
  if (isProtected && !req.auth?.user) {
    const loginUrl = new URL("/admin/login", req.nextUrl.origin);
    if (path !== "/admin") loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  // Force password change BEFORE letting them roam the app.
  // (Allow them to reach /admin/password itself though.)
  if (
    req.auth?.user?.mustChangePassword &&
    path !== "/admin/password" &&
    isProtected
  ) {
    return NextResponse.redirect(
      new URL("/admin/password", req.nextUrl.origin)
    );
  }

  return undefined;
});

export const config = {
  matcher: [
    "/admin/:path*",
    "/p/:path*",
    "/scan/:path*",
    "/scan",
    "/api/file",
  ],
};
