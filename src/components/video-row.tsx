import { VideoCard } from "./video-card";
import Link from "next/link";
import type { VideoListItem } from "@/db/queries";

export function VideoRow({
  title,
  videos,
  seeAllHref,
}: {
  title: string;
  videos: VideoListItem[];
  seeAllHref?: string;
}) {
  if (videos.length === 0) return null;
  return (
    <section className="mb-10">
      <div className="mx-auto max-w-7xl px-6 flex items-baseline justify-between mb-3">
        <h2 className="text-lg md:text-xl font-semibold text-white">
          {title}
        </h2>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="text-xs text-zinc-400 hover:text-white"
          >
            See all →
          </Link>
        )}
      </div>
      <div className="relative">
        <div className="scroll-row overflow-x-auto">
          <div className="flex gap-3 px-6 pb-4 mx-auto max-w-7xl">
            {videos.map((v) => (
              <div key={v.id} className="w-64 flex-shrink-0">
                <VideoCard video={v} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}