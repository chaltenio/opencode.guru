import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { users, videos } from "@/db/schema";
import { and, desc, eq, or } from "drizzle-orm";
import { VideoCard } from "@/components/video-card";
import { timeAgo } from "@/lib/utils";

interface PageProps {
  params: { username: string };
}

export const dynamic = "force-dynamic";
export const revalidate = 60;

export default async function UserProfilePage({ params }: PageProps) {
  const user = (
    await db.select().from(users).where(eq(users.username, params.username)).limit(1)
  )[0];
  if (!user || user.status === "BANNED") notFound();

  const userVideos = await db
    .select()
    .from(videos)
    .where(
      and(
        eq(videos.submittedById, user.id),
        eq(videos.status, "APPROVED"),
        eq(videos.published, true),
      ),
    )
    .orderBy(desc(videos.publishedAt))
    .limit(60);

  // Fetch submitter info for VideoCard
  const submitter = {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="flex items-start gap-6 mb-8">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            className="w-24 h-24 rounded-full border border-zinc-700"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-zinc-700" />
        )}
        <div>
          <h1 className="text-2xl font-bold text-white">
            {user.displayName ?? user.username}
          </h1>
          <p className="text-sm text-zinc-500">@{user.username}</p>
          {user.bio && (
            <p className="mt-2 text-zinc-300 max-w-xl whitespace-pre-wrap">
              {user.bio}
            </p>
          )}
          <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
            <span>Joined {timeAgo(user.createdAt)}</span>
            {user.role !== "USER" && (
              <span className="uppercase bg-brand/15 text-brand px-2 py-0.5 rounded">
                {user.role.replace("_", " ").toLowerCase()}
              </span>
            )}
          </div>
        </div>
      </header>

      <h2 className="text-lg font-semibold text-white mb-4">
        Tutorials submitted ({userVideos.length})
      </h2>
      {userVideos.length === 0 ? (
        <p className="text-zinc-400 text-sm">
          No tutorials yet.{" "}
          {user.id && <Link href="/submit" className="text-brand">Submit one →</Link>}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {userVideos.map((v) => (
            <VideoCard
              key={v.id}
              video={{
                ...v,
                submitter,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}