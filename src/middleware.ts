import NextAuth from "next-auth";
import authConfig from "@/auth.config";

// Edge-safe middleware: uses the slim config (no DB) so it can run in
// Vercel's edge runtime. Role-based gating is in `auth.config.ts -> authorized`.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  // The `authorized` callback in auth.config already handles role gating.
  // For login redirects we add a friendly fallback to /login.
  const session = req.auth;
  const { pathname } = req.nextUrl;

  if (!session?.user && (pathname.startsWith("/admin") || pathname.startsWith("/submit"))) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return Response.redirect(url);
  }
});

export const config = {
  matcher: ["/admin/:path*", "/submit/:path*"],
};