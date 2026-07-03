import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { videos, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ReviewForm } from "@/components/admin/review-form";
import { parseVideoUrl } from "@/lib/video";

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
        submitted by {submitter?.displayName ?? submitter?.username}
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

      <ReviewForm videoId={row.id} currentStatus={row.status} />
    </div>
  );
}