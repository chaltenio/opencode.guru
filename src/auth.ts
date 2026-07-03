import NextAuth, { type DefaultSession } from "next-auth";
import { db } from "@/db";
import { users, oauthAccounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { UserRole } from "@/db/schema";
import authConfig from "./auth.config";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      username: string;
    } & DefaultSession["user"];
  }
  interface User {
    role?: UserRole;
    username?: string;
  }
}

type ExtendedJWT = {
  role?: UserRole;
  username?: string;
  uid?: string;
  [key: string]: unknown;
};

/**
 * Full NextAuth setup with DB-touching callbacks. Used by API routes and
 * server components — never by middleware (which uses the edge-safe config).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      if (!user?.email || !account) return true;

      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1);

      if (existing.length === 0) {
        const baseUsername = (
          (profile as { preferred_username?: string; login?: string })
            ?.preferred_username ||
          (profile as { login?: string })?.login ||
          user.email.split("@")[0]
        )
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, "")
          .slice(0, 32) || `user${Date.now()}`;

        let username = baseUsername;
        let attempt = 0;
        while (
          (
            await db
              .select()
              .from(users)
              .where(eq(users.username, username))
              .limit(1)
          ).length > 0
        ) {
          attempt += 1;
          username = `${baseUsername}${attempt}`.slice(0, 32);
          if (attempt > 50) {
            username = `user${Math.random().toString(36).slice(2, 10)}`;
            break;
          }
        }

        const inserted = await db
          .insert(users)
          .values({
            email: user.email,
            username,
            displayName: user.name ?? username,
            avatarUrl: user.image ?? null,
            role: "USER",
            status: "ACTIVE",
            emailVerifiedAt: new Date(),
          })
          .returning();

        await db
          .insert(oauthAccounts)
          .values({
            provider: account.provider === "google" ? "GOOGLE" : "GITHUB",
            providerUserId: account.providerAccountId,
            userId: inserted[0].id,
          })
          .onConflictDoNothing();
      }
      return true;
    },

    async jwt({ token, user }) {
      const t = token as ExtendedJWT;
      if (user?.email) {
        const rows = await db
          .select()
          .from(users)
          .where(eq(users.email, user.email))
          .limit(1);
        if (rows[0]) {
          t.uid = rows[0].id;
          t.role = rows[0].role;
          t.username = rows[0].username;
        }
      } else if (token.email) {
        const rows = await db
          .select()
          .from(users)
          .where(eq(users.email, token.email as string))
          .limit(1);
        if (rows[0]) {
          t.uid = rows[0].id;
          t.role = rows[0].role;
          t.username = rows[0].username;
        }
      }
      return token;
    },

    async session({ session, token }) {
      const t = token as ExtendedJWT;
      if (t.uid && session.user) {
        session.user.id = t.uid;
        session.user.role = t.role ?? "USER";
        session.user.username = t.username ?? "";
      }
      return session;
    },
  },
});