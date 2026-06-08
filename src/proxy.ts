export { auth as proxy } from "@/auth";

// Match admin area, public-profile pages, and operator scan landing.
// All require login (handled in callbacks.authorized in auth.ts).
export const config = {
  matcher: ["/admin/:path*", "/p/:path*", "/scan/:path*", "/scan"],
};
