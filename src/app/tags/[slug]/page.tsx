import { listPublishedVideos } from "@/db/queries";
import { VideoCard } from "@/components/video-card";

export const dynamic = "force-dynamic";
export const revalidate = 120;

export default async function TagPage({ params }: { params: { slug: string } }) {
  const videos = await listPublishedVideos({ tagSlug: params.slug, limit: 100 });
  const tagName = videos[0]
    ? // best effort — pull a tag name from any video's metadata via query
      videos[0]
    : null;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-2xl font-bold text-white mb-1">#{params.slug}</h1>
      <p className="text-sm text-zinc-500 mb-6">
        {videos.length} tutorial{videos.length === 1 ? "" : "s"}
      </p>
      {videos.length === 0 ? (
        <p className="text-zinc-400">No videos for this tag yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {videos.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      )}
    </div>
  );
}