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
  // Explicitly set so Auth.js gets our validated secret (throws a clear
  // error message in prod if AUTH_SECRET is missing, instead of the generic
  // "MissingSecret" 500).
  secret: process.env.AUTH_SECRET,
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      // Always show the GitHub account picker — prevents silent
      // auto-sign-in after sign-out when the user has a GitHub session
      // cookie from before. `select_account` is OAuth's "show chooser
      // every time" flag (less aggressive than `consent`).
      authorization: {
        params: { prompt: "select_account" },
      },
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        // Was `consent` — now `select_account` to match GitHub and give
        // users the choice of which Google account to sign in with
        // each time, instead of silently reusing the last one.
        params: { prompt: "select_account", access_type: "offline" },
      },
    }),
  ],
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login", // redirect OAuth errors back to /login (which can show a message)
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