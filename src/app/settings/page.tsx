import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SocialProfileForm } from "@/components/settings/social-profile-form";
import { EmailChangeForm } from "@/components/settings/email-change-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/settings");

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  const me = rows[0];
  if (!me) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 space-y-10">
      <header>
        <h1 className="text-2xl font-bold text-white">Profile settings</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Public profile:{" "}
          <a
            href={`/u/${me.username}`}
            className="text-brand hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            /u/{me.username}
          </a>
        </p>
      </header>

      <SocialProfileForm
        initial={{
          displayName: me.displayName ?? "",
          bio: me.bio ?? "",
          githubUsername: me.githubUsername ?? "",
          youtubeHandle: me.youtubeHandle ?? "",
          twitchUsername: me.twitchUsername ?? "",
          vimeoUsername: me.vimeoUsername ?? "",
          linkedinSlug: me.linkedinSlug ?? "",
          xHandle: me.xHandle ?? "",
        }}
      />

      <section>
        <h2 className="text-lg font-semibold text-white">Email address</h2>
        <p className="text-sm text-zinc-400 mt-1 mb-4">
          Your default email is used for sign-in and notifications. Changing
          it requires confirmation via a link sent to the new address.
        </p>
        <dl className="text-sm mb-4">
          <div className="flex items-center justify-between py-1.5 border-b border-zinc-800">
            <dt className="text-zinc-400">Current</dt>
            <dd className="text-zinc-200">
              {me.email}{" "}
              {me.emailVerifiedAt ? (
                <span className="ml-2 text-[10px] uppercase bg-emerald-500/15 text-emerald-300 px-1.5 py-0.5 rounded">
                  Verified
                </span>
              ) : (
                <span className="ml-2 text-[10px] uppercase bg-amber-500/15 text-amber-300 px-1.5 py-0.5 rounded">
                  Unverified
                </span>
              )}
            </dd>
          </div>
          {me.pendingEmail && (
            <div className="flex items-center justify-between py-1.5 border-b border-zinc-800">
              <dt className="text-zinc-400">Pending</dt>
              <dd className="text-amber-200">
                {me.pendingEmail}{" "}
                <span className="ml-2 text-[10px] text-zinc-500">
                  check {me.pendingEmail} for the confirmation link
                </span>
              </dd>
            </div>
          )}
        </dl>
        <EmailChangeForm />
      </section>
    </div>
  );
}