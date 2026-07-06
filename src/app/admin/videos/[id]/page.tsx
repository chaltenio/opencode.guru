import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { videos, users, auditLog } from "@/db/schema";
import { and, desc, eq, or } from "drizzle-orm";
import { ReviewForm } from "@/components/admin/review-form";
import { AdminFlagsPanel } from "@/components/admin/admin-flags-panel";
import { AdminDeletePanel } from "@/components/admin/admin-delete-panel";
import { parseVideoUrl } from "@/lib/video";
import { timeAgo, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReviewVideoPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (
    session.user.role !== "SUPER_ADMIN" &&
    session.user.role !== "MODERATOR"
  ) {
    redirect("/");
  }

  const row = (
    await db.select().from(videos).where(eq(videos.id, params.id)).limit(1)
  )[0];
  if (!row) notFound();

  const submitter = (
    await db.select().from(users).where(eq(users.id, row.submittedById)).limit(1)
  )[0];

  const reviewer = row.reviewedById
    ? (await db
        .select()
        .from(users)
        .where(eq(users.id, row.reviewedById))
        .limit(1))[0]
    : null;

  // Recent admin actions on this video — for a feature/sponsor/order history.
  const recentActions = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      diff: auditLog.diff,
      createdAt: auditLog.createdAt,
      actor: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        role: users.role,
      },
    })
    .from(auditLog)
    .leftJoin(users, eq(users.id, auditLog.actorId))
    .where(
      and(
        eq(auditLog.entityType, "video"),
        eq(auditLog.entityId, row.id),
        or(
          eq(auditLog.action, "video.approve"),
          eq(auditLog.action, "video.reject"),
          eq(auditLog.action, "video.reorder"),
          eq(auditLog.action, "video.flags"),
          eq(auditLog.action, "video.soft_delete"),
          eq(auditLog.action, "video.restore"),
        ),
      ),
    )
    .orderBy(desc(auditLog.createdAt))
    .limit(15);

  const parsed = parseVideoUrl(row.externalUrl);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <a
        href={row.externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-zinc-400 hover:text-white"
      >
        ↗ Open original
      </a>
      <h1 className="text-2xl font-bold text-white mt-2">{row.title}</h1>
      <p className="text-sm text-zinc-400 mt-1">
        {row.platform} · {row.level.toLowerCase()} ·{" "}
        submitted by {submitter?.displayName ?? submitter?.username} ·{" "}
        {timeAgo(row.createdAt)}
      </p>

      <p className="mt-4 text-zinc-200 whitespace-pre-wrap">
        {row.shortDescription}
      </p>
      {row.description && (
        <details className="mt-4 p-3 bg-bg-elev rounded-md border border-zinc-800">
          <summary className="cursor-pointer text-sm text-zinc-300">
            Long description
          </summary>
          <p className="mt-2 text-sm text-zinc-300 whitespace-pre-wrap">
            {row.description}
          </p>
        </details>
      )}

      {parsed && (
        <div className="mt-4 p-3 bg-bg-elev rounded-md border border-zinc-800">
          <p className="text-xs text-zinc-500">Embed URL</p>
          <code className="text-xs text-zinc-300 break-all">
            {parsed.embedUrl}
          </code>
        </div>
      )}

      {/* Approval status */}
      <section className="mt-6 p-4 rounded-lg bg-bg-elev border border-zinc-800">
        <h2 className="text-sm font-semibold text-white mb-3">Review status</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-zinc-500">Status</p>
            <p className="text-zinc-200">{row.status}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Published</p>
            <p className="text-zinc-200">{row.published ? "Yes" : "No"}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Reviewed by</p>
            <p className="text-zinc-200">
              {reviewer
                ? `@${reviewer.username}${reviewer.role !== "USER" ? ` (${reviewer.role.replace("_", " ").toLowerCase()})` : ""}`
                : <span className="text-zinc-500">—</span>}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Reviewed at</p>
            <p className="text-zinc-200">
              {row.reviewedAt ? (
                <span title={formatDateTime(row.reviewedAt)}>
                  {timeAgo(row.reviewedAt)}
                </span>
              ) : (
                <span className="text-zinc-500">—</span>
              )}
            </p>
          </div>
          {row.rejectionReason && (
            <div className="col-span-2">
              <p className="text-xs text-zinc-500">Rejection reason</p>
              <p className="text-red-300 text-sm">{row.rejectionReason}</p>
            </div>
          )}
        </div>
      </section>

      {/* Super-admin-only flag toggles + change history */}
      {session.user.role === "SUPER_ADMIN" && (
        <AdminFlagsPanel
          videoId={row.id}
          slug={row.slug}
          isSponsored={row.isSponsored}
          isFeatured={row.isFeatured}
          order={row.order}
        />
      )}

      {/* Super-admin-only soft delete / restore */}
      {session.user.role === "SUPER_ADMIN" && (
        <AdminDeletePanel
          videoId={row.id}
          deletedAt={
            row.deletedAt
              ? typeof row.deletedAt === "string"
                ? row.deletedAt
                : row.deletedAt.toISOString()
              : null
          }
        />
      )}

      {/* History of admin actions on this video */}
      {recentActions.length > 0 && (
        <section className="mt-6 p-4 rounded-lg bg-bg-elev border border-zinc-800">
          <h2 className="text-sm font-semibold text-white mb-3">
            Admin history
          </h2>
          <ul className="space-y-2 text-xs">
            {recentActions.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 border-b border-zinc-800/60 last:border-b-0 pb-2 last:pb-0"
              >
                <div>
                  <span className="font-mono text-zinc-300">{a.action}</span>{" "}
                  by{" "}
                  <span className="text-white">
                    {a.actor ? `@${a.actor.username}` : "system"}
                  </span>
                </div>
                <span
                  className="text-zinc-500"
                  title={formatDateTime(a.createdAt)}
                >
                  {timeAgo(a.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {row.status === "REVIEW" && (
        <ReviewForm videoId={row.id} currentStatus={row.status} />
      )}
    </div>
  );
}