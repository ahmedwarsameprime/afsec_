import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const proxy = auth((req) => {
  const path = req.nextUrl.pathname;

  // Skip the login + password change pages so we don't redirect-loop.
  if (path === "/admin/login" || path === "/admin/password") {
    return undefined;
  }

  // Force users with mustChangePassword=true to /admin/password.
  if (req.auth?.user?.mustChangePassword) {
    if (
      path.startsWith("/admin") ||
      path.startsWith("/p/") ||
      path.startsWith("/scan")
    ) {
      const url = new URL("/admin/password", req.nextUrl.origin);
      return NextResponse.redirect(url);
    }
  }

  return undefined;
});

export const config = {
  matcher: ["/admin/:path*", "/p/:path*", "/scan/:path*", "/scan", "/api/file"],
};
