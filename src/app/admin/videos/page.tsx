import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { videos, users } from "@/db/schema";
import { alias } from "drizzle-orm/pg-core";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { ReviewQuickActions } from "@/components/admin/review-quick-actions";
import { timeAgo } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminVideosPage({
  searchParams,
}: {
  searchParams: { status?: string; deleted?: string };
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

  const showDeleted = searchParams.deleted === "1";

  // Build WHERE clause
  const whereParts = [] as ReturnType<typeof eq>[];
  if (status) whereParts.push(eq(videos.status, status));
  if (!showDeleted) whereParts.push(isNull(videos.deletedAt));

  // Alias the join for the reviewer (a *second* join to `users`).
  const reviewer = alias(users, "reviewer");

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
      reviewedAt: videos.reviewedAt,
      createdAt: videos.createdAt,
      deletedAt: videos.deletedAt,
      submitter: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
      },
      reviewer: {
        id: reviewer.id,
        username: reviewer.username,
        displayName: reviewer.displayName,
      },
    })
    .from(videos)
    .innerJoin(users, eq(users.id, videos.submittedById))
    .leftJoin(reviewer, eq(reviewer.id, videos.reviewedById))
    .where(whereParts.length > 0 ? and(...whereParts) : sql`true`)
    .orderBy(desc(videos.createdAt))
    .limit(200);

  const baseQS = (() => {
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    if (showDeleted) p.set("deleted", "1");
    return p.toString();
  })();

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="flex items-baseline justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">All videos</h1>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            href={`/admin/videos${status ? `?status=${status}` : ""}`}
            className={`px-3 py-1 rounded ${!showDeleted ? "bg-zinc-700 text-white" : "bg-zinc-800 hover:bg-zinc-700"}`}
          >
            Active
          </Link>
          <Link
            href={`/admin/videos?deleted=1${status ? `&status=${status}` : ""}`}
            className={`px-3 py-1 rounded ${showDeleted ? "bg-zinc-700 text-white" : "bg-zinc-800 hover:bg-zinc-700"}`}
          >
            Deleted
          </Link>
          <span className="mx-2 text-zinc-700">|</span>
          <Link
            href="/admin/videos"
            className={`px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 ${!status && !showDeleted ? "ring-1 ring-brand" : ""}`}
          >
            All
          </Link>
          <Link
            href={`/admin/videos?status=REVIEW${showDeleted ? "&deleted=1" : ""}`}
            className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700"
          >
            Review
          </Link>
          <Link
            href={`/admin/videos?status=APPROVED${showDeleted ? "&deleted=1" : ""}`}
            className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700"
          >
            Approved
          </Link>
          <Link
            href={`/admin/videos?status=REJECTED${showDeleted ? "&deleted=1" : ""}`}
            className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700"
          >
            Rejected
          </Link>
        </div>
      </header>
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-bg-elev text-zinc-400 text-left">
            <tr>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Order / Flags</th>
              <th className="px-3 py-2">Reviewer</th>
              <th className="px-3 py-2">Views</th>
              <th className="px-3 py-2">Likes</th>
              <th className="px-3 py-2">Submitter</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className={`border-t border-zinc-800 align-top ${r.deletedAt ? "opacity-60" : ""}`}
              >
                <td className="px-3 py-2 text-white">
                  <Link
                    href={`/admin/videos/${r.id}`}
                    className="hover:text-brand"
                  >
                    {r.title}
                  </Link>
                  {r.deletedAt && (
                    <span className="ml-2 text-[10px] bg-red-900/40 text-red-300 px-1.5 rounded">
                      DELETED
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-zinc-300">{r.status}</td>
                <td className="px-3 py-2">
                  <ReviewQuickActions
                    videoId={r.id}
                    currentOrder={r.order}
                    isSponsored={r.isSponsored}
                    isFeatured={r.isFeatured}
                    isSuperAdmin={session.user.role === "SUPER_ADMIN"}
                  />
                </td>
                <td className="px-3 py-2 text-xs text-zinc-300">
                  {r.reviewer?.username ? (
                    <span>
                      <span className="text-white">
                        @{r.reviewer.username}
                      </span>{" "}
                      <span className="text-zinc-500">
                        ({timeAgo(r.reviewedAt)})
                      </span>
                    </span>
                  ) : (
                    <span className="text-zinc-500">—</span>
                  )}
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