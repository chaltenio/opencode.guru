import { mostActiveUsers } from "@/db/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export default async function LeaderboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/leaderboard");
  if (session.user.role !== "SUPER_ADMIN") redirect("/");

  const users = await mostActiveUsers(50);
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold text-white mb-1">Most active contributors</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Ranked by approved videos, comments, and likes received.
      </p>
      <ol className="space-y-3">
        {users.map((u, i) => (
          <li
            key={u.id}
            className="flex items-center gap-4 p-3 rounded-lg bg-bg-elev border border-zinc-800"
          >
            <span className="w-8 text-center text-xl font-bold text-zinc-600">
              {i + 1}
            </span>
            {u.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={u.avatarUrl}
                alt=""
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-zinc-700" />
            )}
            <Link
              href={`/u/${u.username}`}
              className="flex-1 min-w-0 font-medium text-white hover:text-brand truncate"
            >
              {u.displayName ?? u.username}
            </Link>
            <span className="text-xs text-zinc-500 hidden sm:inline">
              {u.videosApproved} videos · {u.commentsCount} comments ·{" "}
              {u.likesReceived} likes
            </span>
          </li>
        ))}
        {users.length === 0 && (
          <li className="text-zinc-400 text-sm">No activity yet.</li>
        )}
      </ol>
    </div>
  );
}