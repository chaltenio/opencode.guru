import { VideoPlayer } from "@/components/video-player";
import { listPublishedVideos } from "@/db/queries";
import { VideoRow } from "@/components/video-row";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export default async function HomePage() {
  const [featured, latest, beginner, intermediate, advanced] = await Promise.all([
    listPublishedVideos({ featured: true, limit: 8 }),
    listPublishedVideos({ limit: 12 }),
    listPublishedVideos({ level: "BEGINNER", limit: 8 }),
    listPublishedVideos({ level: "INTERMEDIATE", limit: 8 }),
    listPublishedVideos({ level: "ADVANCED", limit: 8 }),
  ]);

  const hero = featured[0] ?? latest[0];

  return (
    <div>
      {hero && (
        <section className="relative h-[60vh] min-h-[420px] w-full overflow-hidden">
          {hero.thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={hero.thumbnailUrl}
              alt={hero.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-bg/90 via-bg/40 to-transparent" />
          <div className="relative h-full mx-auto max-w-7xl px-6 flex flex-col justify-end pb-16">
            <span className="inline-block text-xs uppercase tracking-widest text-brand font-bold mb-2">
              {hero.isFeatured ? "Featured" : "Latest"} ·{" "}
              {hero.level.toLowerCase()}
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white max-w-3xl leading-tight">
              {hero.title}
            </h1>
            <p className="mt-3 text-zinc-300 max-w-2xl line-clamp-3">
              {hero.shortDescription}
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href={`/v/${hero.slug}`}
                className="px-6 py-2.5 rounded-md bg-white text-black font-semibold hover:bg-zinc-200"
              >
                ▶ Watch
              </a>
              <a
                href={`/v/${hero.slug}#info`}
                className="px-6 py-2.5 rounded-md bg-zinc-700/70 text-white font-semibold hover:bg-zinc-700"
              >
                More info
              </a>
            </div>
          </div>
        </section>
      )}

      <div className="mx-auto max-w-7xl">
        {featured.length > 1 && (
          <VideoRow
            title="Featured this week"
            videos={featured.slice(1)}
            seeAllHref="/browse?featured=1"
          />
        )}
        <VideoRow title="Latest tutorials" videos={latest} seeAllHref="/browse" />
        <VideoRow
          title="Beginner-friendly"
          videos={beginner}
          seeAllHref="/browse?level=BEGINNER"
        />
        <VideoRow
          title="Level up — Intermediate"
          videos={intermediate}
          seeAllHref="/browse?level=INTERMEDIATE"
        />
        <VideoRow
          title="Advanced techniques"
          videos={advanced}
          seeAllHref="/browse?level=ADVANCED"
        />
      </div>
    </div>
  );
}