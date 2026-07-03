import { redirect } from "next/navigation";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/settings");

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Profile settings</h1>
      <p className="text-zinc-400 text-sm">
        Public profile page:{" "}
        <a
          href={`/u/${session.user.username}`}
          className="text-brand hover:underline"
        >
          /u/{session.user.username}
        </a>
      </p>
      <p className="mt-4 text-zinc-500 text-sm">
        Profile editing UI is on the roadmap. For now, edit fields via direct
        DB updates or open a PR.
      </p>
    </div>
  );
}