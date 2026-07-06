import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getVideoBySlug,
  getTagsForVideo,
  getSubmitterForVideo,
  listRelatedVideos,
  listCommentsForVideo,
  incrementVideoViews,
  getUserLikeForVideo,
  getVideoLabel,
} from "@/db/queries";
import { parseVideoUrl } from "@/lib/video";
import { auth } from "@/auth";
import { VideoPlayer } from "@/components/video-player";
import { VideoRow } from "@/components/video-row";
import { VideoActions } from "@/components/video-actions";
import { VideoLabelSelector } from "@/components/video-label-selector";
import { CommentSection } from "@/components/comment-section";
import { formatDuration, formatNumber, timeAgo } from "@/lib/utils";

interface PageProps {
  params: { slug: string };
}

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function generateMetadata({ params }: PageProps) {
  const v = await getVideoBySlug(params.slug);
  if (!v) return {};
  return {
    title: v.title,
    description: v.shortDescription,
    openGraph: {
      title: v.title,
      description: v.shortDescription,
      images: v.thumbnailUrl ? [v.thumbnailUrl] : [],
    },
  };
}

export default async function VideoPage({ params }: PageProps) {
  const v = await getVideoBySlug(params.slug);
  if (!v || v.status !== "APPROVED" || !v.published || v.deletedAt) notFound();

  const parsed = parseVideoUrl(v.externalUrl);
  if (!parsed) notFound();

  const session = await auth();
  const [tags, submitter, related, comments, myLike, myLabel] = await Promise.all([
    getTagsForVideo(v.id),
    getSubmitterForVideo(v.id),
    listRelatedVideos(v.id, v.level),
    listCommentsForVideo(v.id),
    session?.user?.id
      ? getUserLikeForVideo(v.id, session.user.id)
      : Promise.resolve(null),
    session?.user?.id
      ? getVideoLabel(v.id, session.user.id)
      : Promise.resolve(null),
    incrementVideoViews(v.id),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <VideoPlayer embedUrl={parsed.embedUrl} title={v.title} />
          <div id="info" className="mt-6">
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              {v.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-zinc-400">
              <span>{formatNumber(v.viewCount)} views</span>
              <span>·</span>
              <span>{timeAgo(v.publishedAt)}</span>
              <span>·</span>
              <span>{formatDuration(v.durationSec)}</span>
              <span>·</span>
              <span className="uppercase text-xs border border-zinc-700 px-1.5 py-0.5 rounded">
                {v.level.toLowerCase()}
              </span>
            </div>

            <VideoActions
              videoId={v.id}
              initialLike={myLike}
              likeCount={v.likeCount}
              dislikeCount={v.dislikeCount}
              isAuthenticated={!!session?.user}
              externalUrl={v.externalUrl}
            />

            <VideoLabelSelector
              videoId={v.id}
              isAuthenticated={!!session?.user}
              currentLabel={myLabel}
            />

            <div className="mt-6 p-4 bg-bg-elev rounded-lg border border-zinc-800">
              <p className="text-zinc-200 whitespace-pre-wrap">
                {v.description || v.shortDescription}
              </p>
              {tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <Link
                      key={t.id}
                      href={`/tags/${t.slug}`}
                      className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    >
                      #{t.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <CommentSection
            videoId={v.id}
            initialComments={comments}
            isAuthenticated={!!session?.user}
            currentUserId={session?.user?.id ?? null}
          />
        </div>

        <aside className="space-y-4">
          {submitter && (
            <Link
              href={`/u/${submitter.username}`}
              className="flex items-center gap-3 p-3 rounded-lg bg-bg-elev border border-zinc-800 hover:border-zinc-700"
            >
              {submitter.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={submitter.avatarUrl}
                  alt=""
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-zinc-700" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {submitter.displayName ?? submitter.username}
                </p>
                {submitter.bio && (
                  <p className="text-xs text-zinc-400 line-clamp-2">
                    {submitter.bio}
                  </p>
                )}
              </div>
            </Link>
          )}

          <div className="p-4 rounded-lg bg-bg-elev border border-zinc-800">
            <h3 className="text-sm font-semibold text-white mb-2">
              About this video
            </h3>
            <dl className="text-sm space-y-1.5">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Platform</dt>
                <dd className="text-zinc-200">{v.platform}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Language</dt>
                <dd className="text-zinc-200">
                  {v.language === "EN"
                    ? "English"
                    : v.language === "ES"
                      ? "Spanish"
                      : v.language === "PT"
                        ? "Portuguese"
                        : v.language === "HI"
                          ? "Hindi"
                          : v.language === "ZH"
                            ? "Mandarin"
                            : v.language}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Likes</dt>
                <dd className="text-zinc-200">{formatNumber(v.likeCount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Comments</dt>
                <dd className="text-zinc-200">
                  {formatNumber(v.commentCount)}
                </dd>
              </div>
            </dl>
            <a
              href={v.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block text-center text-xs text-brand hover:text-brand-hover"
            >
              Open on {v.platform} ↗
            </a>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <div className="mt-12">
          <VideoRow
            title="Related tutorials"
            videos={related.filter((r) => r.id !== v.id)}
          />
        </div>
      )}
    </div>
  );
}