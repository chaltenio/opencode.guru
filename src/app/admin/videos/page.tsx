import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { videos, users } from "@/db/schema";
import { desc, eq, or, sql } from "drizzle-orm";
import { ReviewQuickActions } from "@/components/admin/review-quick-actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminVideosPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (
    session.user.role !== "SUPER_ADMIN" &&
    session.user.role !== "MODERATOR"
  ) {
    redirect("/");
  }

  const status =
    searchParams.status === "APPROVED" ||
    searchParams.status === "REJECTED" ||
    searchParams.status === "REVIEW"
      ? searchParams.status
      : undefined;

  const rows = await db
    .select({
      id: videos.id,
      slug: videos.slug,
      title: videos.title,
      status: videos.status,
      published: videos.published,
      platform: videos.platform,
      level: videos.level,
      order: videos.order,
      isFeatured: videos.isFeatured,
      isSponsored: videos.isSponsored,
      viewCount: videos.viewCount,
      likeCount: videos.likeCount,
      createdAt: videos.createdAt,
      submitter: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
      },
    })
    .from(videos)
    .innerJoin(users, eq(users.id, videos.submittedById))
    .where(status ? eq(videos.status, status) : sql`true`)
    .orderBy(desc(videos.createdAt))
    .limit(200);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="flex items-baseline justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">All videos</h1>
        <div className="flex gap-2 text-xs">
          <Link href="/admin/videos" className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700">All</Link>
          <Link href="/admin/videos?status=REVIEW" className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700">Review</Link>
          <Link href="/admin/videos?status=APPROVED" className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700">Approved</Link>
          <Link href="/admin/videos?status=REJECTED" className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700">Rejected</Link>
        </div>
      </header>
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-bg-elev text-zinc-400 text-left">
            <tr>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">Views</th>
              <th className="px-3 py-2">Likes</th>
              <th className="px-3 py-2">Submitter</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-zinc-800">
                <td className="px-3 py-2 text-white">
                  <Link
                    href={`/admin/videos/${r.id}`}
                    className="hover:text-brand"
                  >
                    {r.title}
                  </Link>
                  {r.isFeatured && (
                    <span className="ml-2 text-[10px] bg-amber-500/15 text-amber-300 px-1.5 rounded">
                      FEATURED
                    </span>
                  )}
                  {r.isSponsored && (
                    <span className="ml-2 text-[10px] bg-brand/15 text-brand px-1.5 rounded">
                      SPONSORED
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-zinc-300">{r.status}</td>
                <td className="px-3 py-2 text-zinc-300">
                  <ReviewQuickActions
                    videoId={r.id}
                    currentOrder={r.order}
                    isSponsored={r.isSponsored}
                    isFeatured={r.isFeatured}
                    isSuperAdmin={session.user.role === "SUPER_ADMIN"}
                  />
                </td>
                <td className="px-3 py-2 text-zinc-300">{r.viewCount}</td>
                <td className="px-3 py-2 text-zinc-300">{r.likeCount}</td>
                <td className="px-3 py-2 text-zinc-300">
                  {r.submitter.displayName ?? r.submitter.username}
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/admin/videos/${r.id}`}
                    className="text-brand text-xs"
                  >
                    Open →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}