import Link from "next/link";
import { formatDuration, formatNumber, timeAgo } from "@/lib/utils";
import type { VideoListItem } from "@/db/queries";

const LEVEL_BADGE: Record<string, string> = {
  BEGINNER: "bg-emerald-500/15 text-emerald-300 border-emerald-700/40",
  INTERMEDIATE: "bg-sky-500/15 text-sky-300 border-sky-700/40",
  ADVANCED: "bg-purple-500/15 text-purple-300 border-purple-700/40",
};

const PLATFORM_LABEL: Record<string, string> = {
  YOUTUBE: "YouTube",
  VIMEO: "Vimeo",
  TWITCH: "Twitch",
  OTHER: "Other",
};

export function VideoCard({ video }: { video: VideoListItem }) {
  return (
    <Link
      href={`/v/${video.slug}`}
      className="video-card-hover group block rounded-lg overflow-hidden bg-bg-card border border-zinc-800 hover:border-zinc-700"
    >
      <div className="relative aspect-video bg-zinc-900">
        {video.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-xs">
            {PLATFORM_LABEL[video.platform]}
          </div>
        )}
        {video.durationSec ? (
          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[11px] font-medium px-1.5 py-0.5 rounded">
            {formatDuration(video.durationSec)}
          </span>
        ) : null}
        {video.isSponsored && (
          <span className="absolute top-2 left-2 bg-brand text-white text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
            Sponsored
          </span>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className={`text-[10px] uppercase tracking-wide border px-1.5 py-0.5 rounded ${LEVEL_BADGE[video.level]}`}
          >
            {video.level.toLowerCase()}
          </span>
          <span className="text-[10px] text-zinc-500">
            {PLATFORM_LABEL[video.platform]}
          </span>
        </div>
        <h3 className="text-sm font-semibold leading-snug line-clamp-2 text-white group-hover:text-brand-hover">
          {video.title}
        </h3>
        <p className="mt-1 text-xs text-zinc-400 line-clamp-2">
          {video.shortDescription}
        </p>
        <div className="mt-2 flex items-center gap-3 text-[11px] text-zinc-500">
          <span className="truncate">
            {video.submitter.displayName ?? video.submitter.username}
          </span>
          <span>·</span>
          <span>{formatNumber(video.viewCount)} views</span>
          <span>·</span>
          <span>{timeAgo(video.publishedAt ?? video.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}