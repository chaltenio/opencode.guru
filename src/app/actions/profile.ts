"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users, auditLog } from "@/db/schema";
import { socialProfileSchema, requestEmailChangeSchema } from "@/lib/validation";
import { writeAudit } from "@/db/queries";

const EMAIL_CHANGE_TTL_HOURS = 24;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Update the signed-in user's social handles, bio, and display name.
 * Empty strings are normalized to NULL (so the UI can clear a field).
 */
export async function updateSocialProfileAction(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Sign in required" } as const;
  }
  const parsed = socialProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    } as const;
  }

  await db
    .update(users)
    .set({
      githubUsername: parsed.data.githubUsername ?? null,
      youtubeHandle: parsed.data.youtubeHandle ?? null,
      twitchUsername: parsed.data.twitchUsername ?? null,
      vimeoUsername: parsed.data.vimeoUsername ?? null,
      linkedinSlug: parsed.data.linkedinSlug ?? null,
      xHandle: parsed.data.xHandle ?? null,
      bio: parsed.data.bio ?? null,
      displayName: parsed.data.displayName ?? null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  await writeAudit({
    actorId: session.user.id,
    action: "user.social_update",
    entityType: "user",
    entityId: session.user.id,
  });

  revalidatePath(`/u/${session.user.username}`);
  revalidatePath("/settings");
  return { ok: true } as const;
}

// ---------------------------------------------------------------------------
// Email change (double verification)
//
//   Step 1: User submits new email + confirms it (must match).
//           We store pendingEmail + a random token and reply with a
//           "check your inbox" message. In dev / production with no mail
//           transport, we log the verification URL to the server console.
//   Step 2: User clicks the link in the email → /verify-email?token=...
//           Token is matched, expiry checked, email is swapped, and the
//           pending row is cleared.
// ---------------------------------------------------------------------------

/**
 * Generate a 32-byte URL-safe token (≈ 43 chars after base64url).
 */
function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Step 1: queue an email change. Requires the user to type the new
 * address twice (confirmation). If the new address is already in use by
 * another account, the request is rejected.
 */
export async function requestEmailChangeAction(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Sign in required" } as const;
  }
  const parsed = requestEmailChangeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    } as const;
  }

  if (parsed.data.newEmail !== parsed.data.confirmEmail) {
    return {
      ok: false,
      error: "Email and confirmation must match exactly.",
    } as const;
  }

  if (parsed.data.newEmail === session.user.email) {
    return {
      ok: false,
      error: "That is already your email address.",
    } as const;
  }

  // Is the new email already in use by someone else?
  const conflict = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.newEmail))
    .limit(1);
  if (conflict[0] && conflict[0].id !== session.user.id) {
    return {
      ok: false,
      error: "That email is already associated with another account.",
    } as const;
  }

  const token = newToken();
  const expires = new Date(
    Date.now() + EMAIL_CHANGE_TTL_HOURS * 60 * 60 * 1000,
  );

  await db
    .update(users)
    .set({
      pendingEmail: parsed.data.newEmail,
      emailChangeToken: token,
      emailChangeExpiresAt: expires,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  await writeAudit({
    actorId: session.user.id,
    action: "user.email_change_requested",
    entityType: "user",
    entityId: session.user.id,
    diff: { to: parsed.data.newEmail },
  });

  // No mail transport wired up yet — log the URL to the server console.
  // Replace with a real send-mail call (Resend / SES / Postmark) when ready.
  const verifyUrl = `${APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
  console.log(
    `\n[email-change] user=${session.user.username} → ${parsed.data.newEmail}\n` +
      `           verifyUrl: ${verifyUrl}\n` +
      `           expiresAt: ${expires.toISOString()}\n`,
  );

  revalidatePath("/settings");
  return {
    ok: true,
    message:
      "Check the email inbox for the new address. A confirmation link has been sent. (In development, the link is logged to the server console.)",
  } as const;
}

/**
 * Step 2: commit the email change once the user clicks the link.
 * Validates the token, expiry, and that no one else now owns the new email.
 */
export async function verifyEmailChangeAction(input: unknown) {
  const { z } = await import("zod");
  const parsed = z
    .object({ token: z.string().min(10).max(128) })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid token" } as const;
  }

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.emailChangeToken, parsed.data.token))
    .limit(1);
  if (!rows[0]) {
    return { ok: false, error: "Token not found or already used." } as const;
  }
  const user = rows[0];

  if (!user.pendingEmail || !user.emailChangeExpiresAt) {
    return { ok: false, error: "No pending email change for this account." } as const;
  }
  if (user.emailChangeExpiresAt.getTime() < Date.now()) {
    return {
      ok: false,
      error: "This verification link has expired. Please request a new one.",
    } as const;
  }

  // Re-check uniqueness (in case someone else registered the new email
  // while this link was in flight).
  const conflict = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, user.pendingEmail))
    .limit(1);
  if (conflict[0] && conflict[0].id !== user.id) {
    return {
      ok: false,
      error: "That email is now associated with another account. Please pick a different one.",
    } as const;
  }

  const oldEmail = user.email;
  await db
    .update(users)
    .set({
      email: user.pendingEmail,
      emailVerifiedAt: new Date(),
      pendingEmail: null,
      emailChangeToken: null,
      emailChangeExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  await writeAudit({
    actorId: user.id,
    action: "user.email_change_committed",
    entityType: "user",
    entityId: user.id,
    diff: { from: oldEmail, to: user.pendingEmail },
  });

  revalidatePath("/settings");
  revalidatePath(`/u/${user.username}`);
  return { ok: true, newEmail: user.pendingEmail } as const;
}

/**
 * Cancel a pending email change (clears the token + pendingEmail).
 */
export async function cancelEmailChangeAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Sign in required" } as const;
  }
  await db
    .update(users)
    .set({
      pendingEmail: null,
      emailChangeToken: null,
      emailChangeExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  revalidatePath("/settings");
  return { ok: true } as const;
}