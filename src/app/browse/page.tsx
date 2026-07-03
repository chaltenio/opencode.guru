import { listPublishedVideos } from "@/db/queries";
import { VideoCard } from "@/components/video-card";
import Link from "next/link";

interface SearchParams {
  level?: string;
  platform?: string;
  tag?: string;
  q?: string;
  featured?: string;
}

export const dynamic = "force-dynamic";
export const revalidate = 60;

const PAGE_SIZE = 24;

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const level = ["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(
    searchParams.level ?? "",
  )
    ? (searchParams.level as "BEGINNER" | "INTERMEDIATE" | "ADVANCED")
    : undefined;
  const platform = ["YOUTUBE", "VIMEO", "TWITCH", "OTHER"].includes(
    searchParams.platform ?? "",
  )
    ? (searchParams.platform as "YOUTUBE" | "VIMEO" | "TWITCH" | "OTHER")
    : undefined;

  const videos = await listPublishedVideos({
    level,
    platform,
    tagSlug: searchParams.tag,
    q: searchParams.q,
    featured: searchParams.featured === "1",
    limit: 100,
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Browse tutorials</h1>

      <form className="mb-6 flex flex-wrap gap-3" action="/browse">
        <input
          name="q"
          defaultValue={searchParams.q}
          placeholder="Search…"
          className="px-3 py-2 rounded-md bg-bg-elev border border-zinc-800 text-sm flex-1 min-w-[200px]"
        />
        <select
          name="level"
          defaultValue={level ?? ""}
          className="px-3 py-2 rounded-md bg-bg-elev border border-zinc-800 text-sm"
        >
          <option value="">All levels</option>
          <option value="BEGINNER">Beginner</option>
          <option value="INTERMEDIATE">Intermediate</option>
          <option value="ADVANCED">Advanced</option>
        </select>
        <select
          name="platform"
          defaultValue={platform ?? ""}
          className="px-3 py-2 rounded-md bg-bg-elev border border-zinc-800 text-sm"
        >
          <option value="">All platforms</option>
          <option value="YOUTUBE">YouTube</option>
          <option value="VIMEO">Vimeo</option>
          <option value="TWITCH">Twitch</option>
          <option value="OTHER">Other</option>
        </select>
        <button className="px-4 py-2 rounded-md bg-brand hover:bg-brand-hover text-white text-sm">
          Filter
        </button>
      </form>

      <p className="text-sm text-zinc-500 mb-4">
        {videos.length} result{videos.length === 1 ? "" : "s"}
      </p>

      {videos.length === 0 ? (
        <p className="text-zinc-400">
          No videos match these filters. Try{" "}
          <Link href="/browse" className="text-brand">
            clearing filters
          </Link>{" "}
          or{" "}
          <Link href="/submit" className="text-brand">
            submit one
          </Link>
          .
        </p>
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