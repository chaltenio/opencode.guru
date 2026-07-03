import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

/**
 * Edge-safe NextAuth config. NO database imports here — this file is loaded
 * by `middleware.ts` which runs in the Vercel edge runtime.
 *
 * Anything that needs Drizzle / postgres-js belongs in `src/auth.ts`, which
 * extends this config with DB callbacks.
 */
export default {
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: { prompt: "consent", access_type: "offline" },
      },
    }),
  ],
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const role = auth?.user?.role;
      const isLoggedIn = !!auth?.user;

      // /admin/* requires moderator or super_admin
      if (pathname.startsWith("/admin")) {
        return role === "MODERATOR" || role === "SUPER_ADMIN";
      }
      // /submit requires login
      if (pathname.startsWith("/submit")) {
        return isLoggedIn;
      }
      return true;
    },
  },
} satisfies NextAuthConfig;