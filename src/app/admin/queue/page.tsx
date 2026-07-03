import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { listPendingVideos } from "@/db/queries";
import Link from "next/link";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (
    session.user.role !== "SUPER_ADMIN" &&
    session.user.role !== "MODERATOR"
  ) {
    redirect("/");
  }

  const videos = await listPendingVideos(100);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">
        Review queue ({videos.length})
      </h1>
      {videos.length === 0 ? (
        <p className="text-zinc-400">No videos pending review.</p>
      ) : (
        <ul className="space-y-2">
          {videos.map((v) => (
            <li
              key={v.id}
              className="p-4 rounded-lg bg-bg-elev border border-zinc-800 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <h2 className="font-semibold text-white truncate">{v.title}</h2>
                <p className="text-xs text-zinc-500 line-clamp-1">
                  {v.shortDescription}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {v.platform} · {v.level.toLowerCase()} ·{" "}
                  {timeAgo(v.createdAt)} · by{" "}
                  {v.submitter.displayName ?? v.submitter.username}
                </p>
              </div>
              <Link
                href={`/admin/videos/${v.id}`}
                className="px-4 py-1.5 rounded-md bg-brand hover:bg-brand-hover text-white text-sm whitespace-nowrap"
              >
                Review
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}